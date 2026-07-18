package com.mytax.mapper.invoice;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mytax.mapper.mapping.MappedInvoice;
import com.mytax.mapper.mapping.MappedInvoiceLineItem;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Builds the "document" + "documentHash" pair expected by
 * POST /api/v1.0/documentsubmissions (format=JSON).
 *
 * NOTE — scaffold limitation: this emits a simplified JSON approximation of the invoice
 * fields, not the full LHDN UBL 2.1 JSON schema (which also requires digital signature
 * blocks, full party address/contact structures, tax scheme codes, etc. per the MyInvois
 * SDK). Replace the body of {@link #buildInvoiceJson} with a real UBL JSON document builder
 * before submitting to anything beyond the sandbox "no validation" testing flow.
 */
@Component
public class UblDocumentBuilder {

    private final ObjectMapper objectMapper;

    public UblDocumentBuilder(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public record BuiltDocument(String base64Document, String sha256Hash, String codeNumber) {
    }

    public BuiltDocument build(MappedInvoice invoice, List<MappedInvoiceLineItem> lineItems) {
        String codeNumber = "INV-" + invoice.getId();
        String json = buildInvoiceJson(invoice, lineItems, codeNumber);

        String hash = sha256Hex(json);
        String base64 = Base64.getEncoder().encodeToString(json.getBytes(StandardCharsets.UTF_8));

        return new BuiltDocument(base64, hash, codeNumber);
    }

    private String buildInvoiceJson(MappedInvoice invoice, List<MappedInvoiceLineItem> lineItems, String codeNumber) {
        Map<String, Object> doc = new LinkedHashMap<>();
        doc.put("ID", codeNumber);
        doc.put("IssueDate", invoice.getIssueDate() != null ? invoice.getIssueDate().toString() : null);
        doc.put("InvoiceTypeCode", invoice.getInvoiceTypeCode());
        doc.put("DocumentCurrencyCode", invoice.getCurrencyCode());

        doc.put("Supplier", Map.of(
                "TIN", nullToEmpty(invoice.getSupplierTin()),
                "Name", nullToEmpty(invoice.getSupplierName())
        ));
        doc.put("Buyer", Map.of(
                "TIN", nullToEmpty(invoice.getBuyerTin()),
                "Name", nullToEmpty(invoice.getBuyerName())
        ));

        doc.put("LegalMonetaryTotal", Map.of(
                "TaxExclusiveAmount", invoice.getSubtotal(),
                "TaxInclusiveAmount", invoice.getGrandTotal(),
                "TaxAmount", invoice.getTaxTotal()
        ));

        doc.put("InvoiceLines", lineItems.stream().map(li -> Map.of(
                "ID", li.getLineNo(),
                "Item", Map.of(
                        "Description", nullToEmpty(li.getDescription()),
                        "ClassificationCode", nullToEmpty(li.getClassificationCode())
                ),
                "Quantity", li.getQuantity(),
                "UnitPrice", li.getUnitPrice(),
                "TaxAmount", li.getTaxAmount()
        )).toList());

        try {
            return objectMapper.writeValueAsString(doc);
        } catch (Exception e) {
            throw new IllegalStateException("Failed to serialize invoice to JSON", e);
        }
    }

    private String nullToEmpty(String value) {
        return value == null ? "" : value;
    }

    private String sha256Hex(String content) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(content.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder();
            for (byte b : hash) {
                hex.append(String.format("%02x", b));
            }
            return hex.toString();
        } catch (Exception e) {
            throw new IllegalStateException("Failed to hash invoice document", e);
        }
    }
}
