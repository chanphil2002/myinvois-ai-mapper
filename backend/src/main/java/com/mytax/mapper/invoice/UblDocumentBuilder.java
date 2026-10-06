package com.mytax.mapper.invoice;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mytax.mapper.mapping.MappedInvoice;
import com.mytax.mapper.mapping.MappedInvoiceLineItem;
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
 * Builds the "document" + "documentHash" pair expected by
 * POST /api/v1.0/documentsubmissions (format=JSON).
 *
 * Field shape (the "_D"/"_A"/"_B" namespace wrapper, and every leaf being a one-element array
 * of {"_": value, ...attributes}) was reverse-engineered from a real, LHDN-validated ("status":
 * "Valid") submission the user pulled from their MyInvois account — not guessed. Optional UBL
 * sections we have no real data for (Delivery, PaymentMeans, PaymentTerms, PrepaidPayment,
 * BillingReference, AdditionalDocumentReference, per-line AllowanceCharge) are omitted entirely
 * rather than emitted as blank placeholders — the reference document had them blank, which reads
 * as a template artifact of whatever software produced it, not a strict LHDN requirement. Revisit
 * if a real submission gets rejected for a missing section.
 *
 * NOT implemented: the digital signature (UBLExtensions/XAdES-BES) block the reference document
 * ends with. LHDN requires every submission to be signed with a certificate issued by an approved
 * provider (the reference was signed via "Trial LHDNM Sub CA V1" / POS Digicert) — that needs a
 * real certificate + private key this scaffold doesn't have. Submissions built here are correctly
 * shaped but unsigned, and will likely be rejected by LHDN until signing is added.
 *
 * The structural helpers (leaf-wrapping, tax category, supplier party, etc.) shared with
 * consolidated e-invoices live in {@link UblJsonSupport}.
 */
@Component
public class UblDocumentBuilder {

    private final ObjectMapper objectMapper;
    private final UblJsonSupport support;

    public UblDocumentBuilder(ObjectMapper objectMapper, UblJsonSupport support) {
        this.objectMapper = objectMapper;
        this.support = support;
    }

    public BuiltDocument build(BusinessProfile supplier, MappedInvoice invoice, List<MappedInvoiceLineItem> lineItems) {
        String codeNumber = "INV-" + invoice.getId();
        String json = buildInvoiceJson(supplier, invoice, lineItems, codeNumber);

        String hash = support.sha256Hex(json);
        String base64 = Base64.getEncoder().encodeToString(json.getBytes(StandardCharsets.UTF_8));

        return new BuiltDocument(base64, hash, codeNumber);
    }

    private String buildInvoiceJson(BusinessProfile supplier, MappedInvoice invoice,
                                     List<MappedInvoiceLineItem> lineItems, String codeNumber) {
        String currency = invoice.getCurrencyCode() != null ? invoice.getCurrencyCode() : "MYR";

        Map<String, Object> invoiceNode = new LinkedHashMap<>();
        support.put(invoiceNode, "ID", support.val(codeNumber));
        support.put(invoiceNode, "IssueDate", support.val(invoice.getIssueDate() != null ? invoice.getIssueDate().toString() : null));
        support.put(invoiceNode, "IssueTime", support.val("00:00:00Z"));
        // Document version "1.0" — per LHDN's SDK FAQ, only version 1.1 triggers digital-signature
        // validation; 1.0 is accepted without a signature "until such time as LHDN issues an
        // official notice concerning the retirement of version 1.0." Digital signing (UBLExtensions/
        // XAdES-BES, see class doc comment) is still not implemented, so this lets real sandbox
        // submissions succeed in the meantime. Bump back to "1.1" once signing is built.
        support.put(invoiceNode, "InvoiceTypeCode", support.val(invoice.getInvoiceTypeCode(), Map.of("listVersionID", "1.0")));
        support.put(invoiceNode, "DocumentCurrencyCode", support.val(currency));

        support.put(invoiceNode, "AccountingSupplierParty", List.of(Map.of("Party", List.of(support.supplierParty(supplier)))));
        support.put(invoiceNode, "AccountingCustomerParty", List.of(Map.of("Party", List.of(buyerParty(invoice)))));

        BigDecimal subtotal = support.nz(invoice.getSubtotal());
        BigDecimal taxTotal = support.nz(invoice.getTaxTotal());
        BigDecimal grandTotal = support.nz(invoice.getGrandTotal());

        support.put(invoiceNode, "TaxTotal", List.of(support.taxTotalNode(taxTotal, subtotal, currency)));
        support.put(invoiceNode, "LegalMonetaryTotal",
                List.of(support.legalMonetaryTotal(invoice.getDiscountTotal(), subtotal, grandTotal, currency)));

        if (invoice.getDiscountTotal() != null && invoice.getDiscountTotal().signum() > 0) {
            support.put(invoiceNode, "AllowanceCharge", List.of(Map.of(
                    "ChargeIndicator", support.val(false),
                    "AllowanceChargeReason", support.val("Discount"),
                    "Amount", support.val(invoice.getDiscountTotal(), Map.of("currencyID", currency))
            )));
        }

        List<Map<String, Object>> lines = new ArrayList<>();
        for (MappedInvoiceLineItem item : lineItems) {
            lines.add(support.invoiceLine(item.getLineNo(), item.getDescription(), item.getQuantity(),
                    item.getUnitPrice(), item.getTaxAmount(), item.getUnitCode(), item.getClassificationCode(), currency));
        }
        support.put(invoiceNode, "InvoiceLine", lines);

        // Same currency, no conversion. LHDN's SDK docs: "input value 0.00 if exchange rate is not
        // applicable" — confirmed against the real reference document too, which used 0 here.
        support.put(invoiceNode, "TaxExchangeRate", List.of(Map.of(
                "SourceCurrencyCode", support.val(currency),
                "TargetCurrencyCode", support.val(currency),
                "CalculationRate", support.val(BigDecimal.ZERO)
        )));

        // TODO: digital signature (UBLExtensions + Signature nodes) goes here — see class doc comment.
        // The reference file this builder was reverse-engineered from has a worked example of the
        // full XAdES-BES block once a real signing certificate is available.

        try {
            return objectMapper.writeValueAsString(support.wrapRoot(invoiceNode));
        } catch (Exception e) {
            throw new IllegalStateException("Failed to serialize invoice to JSON", e);
        }
    }

    private Map<String, Object> buyerParty(MappedInvoice invoice) {
        Map<String, Object> party = new LinkedHashMap<>();

        List<Map<String, Object>> ids = new ArrayList<>();
        support.addIdentification(ids, "TIN", invoice.getBuyerTin());
        support.addIdentification(ids, invoice.getBuyerIdType(), invoice.getBuyerIdValue());
        support.addIdentification(ids, "SST", invoice.getBuyerSst());
        support.put(party, "PartyIdentification", ids.isEmpty() ? null : ids);

        Map<String, Object> address = support.postalAddress(
                invoice.getBuyerCity(), invoice.getBuyerPostalZone(), invoice.getBuyerStateCode(),
                invoice.getBuyerAddressLine1(), invoice.getBuyerAddressLine2(), invoice.getBuyerCountryCode());
        if (!address.isEmpty()) {
            support.put(party, "PostalAddress", List.of(address));
        }

        // Map.of rejects null values, so only emit RegistrationName when a buyer name is present.
        // A missing buyer name is caught upfront by SubmissionService validation; this guard keeps
        // the builder from throwing an opaque NPE if it is ever reached without one.
        List<Map<String, Object>> registrationName = support.val(invoice.getBuyerName());
        if (registrationName != null) {
            support.put(party, "PartyLegalEntity", List.of(Map.of("RegistrationName", registrationName)));
        }
        support.put(party, "Contact", support.contact(invoice.getBuyerPhone(), invoice.getBuyerEmail()));
        return party;
    }
}
