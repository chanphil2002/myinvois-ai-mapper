package com.mytax.mapper.invoice;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mytax.mapper.config.ConsolidationProperties;
import com.mytax.mapper.consolidation.ConsolidatedInvoice;
import com.mytax.mapper.mapping.SalesTransaction;
import com.mytax.mapper.profile.BusinessProfile;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Consolidated-e-invoice counterpart to {@link UblDocumentBuilder}: same UBL-as-JSON shape and
 * shared structural helpers ({@link UblJsonSupport}), but the buyer is LHDN's generic
 * "consolidated e-invoice" buyer (see {@link ConsolidationProperties} — a documented placeholder,
 * not verified policy) instead of a real extracted buyer, and it adds an InvoicePeriod block
 * covering the aggregation period, which individual invoices have no notion of.
 */
@Component
public class ConsolidatedUblDocumentBuilder {

    private final ObjectMapper objectMapper;
    private final UblJsonSupport support;
    private final ConsolidationProperties consolidationProperties;

    public ConsolidatedUblDocumentBuilder(ObjectMapper objectMapper, UblJsonSupport support,
                                           ConsolidationProperties consolidationProperties) {
        this.objectMapper = objectMapper;
        this.support = support;
        this.consolidationProperties = consolidationProperties;
    }

    public BuiltDocument build(BusinessProfile supplier, ConsolidatedInvoice invoice, List<SalesTransaction> transactions) {
        String codeNumber = "CON-" + invoice.getId();
        String json = buildInvoiceJson(supplier, invoice, transactions, codeNumber);

        String hash = support.sha256Hex(json);
        String base64 = Base64.getEncoder().encodeToString(json.getBytes(StandardCharsets.UTF_8));

        return new BuiltDocument(base64, hash, codeNumber);
    }

    private String buildInvoiceJson(BusinessProfile supplier, ConsolidatedInvoice invoice,
                                     List<SalesTransaction> transactions, String codeNumber) {
        String currency = invoice.getCurrencyCode() != null ? invoice.getCurrencyCode() : "MYR";

        Map<String, Object> invoiceNode = new LinkedHashMap<>();
        support.put(invoiceNode, "ID", support.val(codeNumber));
        support.put(invoiceNode, "IssueDate",
                support.val(invoice.getPeriodEnd() != null ? invoice.getPeriodEnd().toString() : null));
        support.put(invoiceNode, "IssueTime", support.val("00:00:00Z"));
        support.put(invoiceNode, "InvoiceTypeCode", support.val(invoice.getInvoiceTypeCode(), Map.of("listVersionID", "1.1")));
        support.put(invoiceNode, "DocumentCurrencyCode", support.val(currency));

        support.put(invoiceNode, "InvoicePeriod", List.of(new LinkedHashMap<>(Map.of(
                "StartDate", support.val(invoice.getPeriodStart() != null ? invoice.getPeriodStart().toString() : null),
                "EndDate", support.val(invoice.getPeriodEnd() != null ? invoice.getPeriodEnd().toString() : null),
                "Description", support.val("Consolidated e-Invoice")
        ))));

        support.put(invoiceNode, "AccountingSupplierParty", List.of(Map.of("Party", List.of(support.supplierParty(supplier)))));
        support.put(invoiceNode, "AccountingCustomerParty", List.of(Map.of("Party", List.of(genericBuyerParty()))));

        BigDecimal subtotal = support.nz(invoice.getSubtotal());
        BigDecimal taxTotal = support.nz(invoice.getTaxTotal());
        BigDecimal grandTotal = support.nz(invoice.getGrandTotal());

        support.put(invoiceNode, "TaxTotal", List.of(support.taxTotalNode(taxTotal, subtotal, currency)));
        support.put(invoiceNode, "LegalMonetaryTotal",
                List.of(support.legalMonetaryTotal(BigDecimal.ZERO, subtotal, grandTotal, currency)));

        List<Map<String, Object>> lines = new ArrayList<>();
        int lineNo = 1;
        for (SalesTransaction transaction : transactions) {
            lines.add(support.invoiceLine(lineNo++, transaction.getDescription(), transaction.getQuantity(),
                    transaction.getUnitPrice(), transaction.getTaxAmount(), transaction.getUnitCode(),
                    transaction.getClassificationCode(), currency));
        }
        support.put(invoiceNode, "InvoiceLine", lines);

        // Same currency, no conversion — see UblDocumentBuilder's identical block for rationale.
        support.put(invoiceNode, "TaxExchangeRate", List.of(Map.of(
                "SourceCurrencyCode", support.val(currency),
                "TargetCurrencyCode", support.val(currency),
                "CalculationRate", support.val(BigDecimal.ONE)
        )));

        // TODO: digital signature — see UblDocumentBuilder's class comment; the same gap applies here.

        try {
            return objectMapper.writeValueAsString(support.wrapRoot(invoiceNode));
        } catch (Exception e) {
            throw new IllegalStateException("Failed to serialize consolidated invoice to JSON", e);
        }
    }

    /**
     * LHDN's real "generic buyer" convention for consolidated e-invoices (TIN, registration name)
     * isn't available in this codebase or the reference Postman collection — these values come
     * from {@link ConsolidationProperties}, a documented placeholder. Confirm against LHDN's
     * actual published guideline before relying on this for a real submission.
     */
    private Map<String, Object> genericBuyerParty() {
        Map<String, Object> party = new LinkedHashMap<>();
        List<Map<String, Object>> ids = new ArrayList<>();
        support.addIdentification(ids, "TIN", consolidationProperties.getGenericBuyerTin());
        support.put(party, "PartyIdentification", ids.isEmpty() ? null : ids);
        // Map.of rejects null values; guard so a misconfigured generic-buyer name degrades to an
        // omitted field rather than an opaque NPE (mirrors UblDocumentBuilder.buyerParty).
        List<Map<String, Object>> registrationName = support.val(consolidationProperties.getGenericBuyerName());
        if (registrationName != null) {
            support.put(party, "PartyLegalEntity", List.of(Map.of("RegistrationName", registrationName)));
        }
        return party;
    }
}
