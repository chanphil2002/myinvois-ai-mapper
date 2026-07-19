package com.mytax.mapper.invoice;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mytax.mapper.mapping.MappedInvoice;
import com.mytax.mapper.mapping.MappedInvoiceLineItem;
import com.mytax.mapper.profile.BusinessProfile;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
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
 */
@Component
public class UblDocumentBuilder {

    private static final String TAX_CATEGORY_STANDARD = "01";
    private static final String TAX_SCHEME_ID = "OTH";
    private static final String TAX_SCHEME_AGENCY_ID = "6";
    private static final String TAX_SCHEME_SCHEME_ID = "UN/ECE 5153";

    private final ObjectMapper objectMapper;

    public UblDocumentBuilder(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public record BuiltDocument(String base64Document, String sha256Hash, String codeNumber) {
    }

    public BuiltDocument build(BusinessProfile supplier, MappedInvoice invoice, List<MappedInvoiceLineItem> lineItems) {
        String codeNumber = "INV-" + invoice.getId();
        String json = buildInvoiceJson(supplier, invoice, lineItems, codeNumber);

        String hash = sha256Hex(json);
        String base64 = Base64.getEncoder().encodeToString(json.getBytes(StandardCharsets.UTF_8));

        return new BuiltDocument(base64, hash, codeNumber);
    }

    private String buildInvoiceJson(BusinessProfile supplier, MappedInvoice invoice,
                                     List<MappedInvoiceLineItem> lineItems, String codeNumber) {
        String currency = invoice.getCurrencyCode() != null ? invoice.getCurrencyCode() : "MYR";

        Map<String, Object> invoiceNode = new LinkedHashMap<>();
        put(invoiceNode, "ID", val(codeNumber));
        put(invoiceNode, "IssueDate", val(invoice.getIssueDate() != null ? invoice.getIssueDate().toString() : null));
        put(invoiceNode, "IssueTime", val("00:00:00Z"));
        put(invoiceNode, "InvoiceTypeCode", val(invoice.getInvoiceTypeCode(), Map.of("listVersionID", "1.1")));
        put(invoiceNode, "DocumentCurrencyCode", val(currency));

        put(invoiceNode, "AccountingSupplierParty", List.of(Map.of("Party", List.of(supplierParty(supplier)))));
        put(invoiceNode, "AccountingCustomerParty", List.of(Map.of("Party", List.of(buyerParty(invoice)))));

        BigDecimal subtotal = nz(invoice.getSubtotal());
        BigDecimal taxTotal = nz(invoice.getTaxTotal());
        BigDecimal grandTotal = nz(invoice.getGrandTotal());

        put(invoiceNode, "TaxTotal", List.of(taxTotalNode(taxTotal, subtotal, currency)));
        put(invoiceNode, "LegalMonetaryTotal", List.of(legalMonetaryTotal(invoice, subtotal, grandTotal, currency)));

        if (invoice.getDiscountTotal() != null) {
            put(invoiceNode, "AllowanceCharge", List.of(Map.of(
                    "ChargeIndicator", val(false),
                    "AllowanceChargeReason", val("Discount"),
                    "Amount", val(invoice.getDiscountTotal(), Map.of("currencyID", currency))
            )));
        }

        List<Map<String, Object>> lines = new ArrayList<>();
        for (MappedInvoiceLineItem item : lineItems) {
            lines.add(invoiceLine(item, currency));
        }
        put(invoiceNode, "InvoiceLine", lines);

        // Same currency, no conversion — the reference document used CalculationRate 0 here, which
        // looks like an unused-field placeholder rather than a real rate; 1 is the correct value for
        // "no conversion" and is what's emitted here. Revisit if LHDN rejects this.
        put(invoiceNode, "TaxExchangeRate", List.of(Map.of(
                "SourceCurrencyCode", val(currency),
                "TargetCurrencyCode", val(currency),
                "CalculationRate", val(BigDecimal.ONE)
        )));

        // TODO: digital signature (UBLExtensions + Signature nodes) goes here — see class doc comment.
        // The reference file this builder was reverse-engineered from has a worked example of the
        // full XAdES-BES block once a real signing certificate is available.

        Map<String, Object> root = new LinkedHashMap<>();
        root.put("_D", "urn:oasis:names:specification:ubl:schema:xsd:Invoice-2");
        root.put("_A", "urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2");
        root.put("_B", "urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2");
        root.put("Invoice", List.of(invoiceNode));

        try {
            return objectMapper.writeValueAsString(root);
        } catch (Exception e) {
            throw new IllegalStateException("Failed to serialize invoice to JSON", e);
        }
    }

    private Map<String, Object> supplierParty(BusinessProfile supplier) {
        Map<String, Object> party = new LinkedHashMap<>();
        put(party, "IndustryClassificationCode",
                val(supplier.getMsicCode(), Map.of("name", nullToEmpty(supplier.getMsicDescription()))));

        List<Map<String, Object>> ids = new ArrayList<>();
        addIdentification(ids, "TIN", supplier.getTin());
        addIdentification(ids, supplier.getIdType(), supplier.getIdValue());
        addIdentification(ids, "SST", supplier.getSstRegistration());
        addIdentification(ids, "TTX", supplier.getTtxRegistration());
        put(party, "PartyIdentification", ids.isEmpty() ? null : ids);

        put(party, "PostalAddress", List.of(postalAddress(
                supplier.getCity(), supplier.getPostalZone(), supplier.getStateCode(),
                supplier.getAddressLine1(), supplier.getAddressLine2(), supplier.getCountryCode())));

        put(party, "PartyLegalEntity", List.of(Map.of("RegistrationName", val(supplier.getRegistrationName()))));
        put(party, "Contact", contact(supplier.getPhone(), supplier.getEmail()));
        return party;
    }

    private Map<String, Object> buyerParty(MappedInvoice invoice) {
        Map<String, Object> party = new LinkedHashMap<>();

        List<Map<String, Object>> ids = new ArrayList<>();
        addIdentification(ids, "TIN", invoice.getBuyerTin());
        addIdentification(ids, invoice.getBuyerIdType(), invoice.getBuyerIdValue());
        addIdentification(ids, "SST", invoice.getBuyerSst());
        put(party, "PartyIdentification", ids.isEmpty() ? null : ids);

        Map<String, Object> address = postalAddress(
                invoice.getBuyerCity(), invoice.getBuyerPostalZone(), invoice.getBuyerStateCode(),
                invoice.getBuyerAddressLine1(), invoice.getBuyerAddressLine2(), invoice.getBuyerCountryCode());
        if (!address.isEmpty()) {
            put(party, "PostalAddress", List.of(address));
        }

        put(party, "PartyLegalEntity", List.of(Map.of("RegistrationName", val(invoice.getBuyerName()))));
        put(party, "Contact", contact(invoice.getBuyerPhone(), invoice.getBuyerEmail()));
        return party;
    }

    private void addIdentification(List<Map<String, Object>> target, String schemeId, String value) {
        if (schemeId == null || value == null || value.isBlank()) {
            return;
        }
        target.add(Map.of("ID", val(value, Map.of("schemeID", schemeId))));
    }

    private Map<String, Object> postalAddress(String city, String postalZone, String stateCode,
                                               String addressLine1, String addressLine2, String countryCode) {
        Map<String, Object> address = new LinkedHashMap<>();
        put(address, "CityName", val(city));
        put(address, "PostalZone", val(postalZone));
        put(address, "CountrySubentityCode", val(stateCode));

        List<Map<String, Object>> lines = new ArrayList<>();
        if (addressLine1 != null && !addressLine1.isBlank()) {
            lines.add(Map.of("Line", val(addressLine1)));
        }
        if (addressLine2 != null && !addressLine2.isBlank()) {
            lines.add(Map.of("Line", val(addressLine2)));
        }
        put(address, "AddressLine", lines.isEmpty() ? null : lines);

        if (countryCode != null && !countryCode.isBlank()) {
            put(address, "Country", List.of(Map.of("IdentificationCode",
                    val(countryCode, Map.of("listID", "3166-1", "listAgencyID", "ISO")))));
        }
        return address;
    }

    private List<Map<String, Object>> contact(String phone, String email) {
        if ((phone == null || phone.isBlank()) && (email == null || email.isBlank())) {
            return null;
        }
        Map<String, Object> contact = new LinkedHashMap<>();
        put(contact, "Telephone", val(phone));
        put(contact, "ElectronicMail", val(email));
        return List.of(contact);
    }

    private Map<String, Object> taxTotalNode(BigDecimal taxTotal, BigDecimal subtotal, String currency) {
        return Map.of(
                "TaxAmount", val(taxTotal, Map.of("currencyID", currency)),
                "TaxSubtotal", List.of(Map.of(
                        "TaxableAmount", val(subtotal, Map.of("currencyID", currency)),
                        "TaxAmount", val(taxTotal, Map.of("currencyID", currency)),
                        "TaxCategory", List.of(taxCategory())
                ))
        );
    }

    private Map<String, Object> taxCategory() {
        return Map.of(
                "ID", val(TAX_CATEGORY_STANDARD),
                "TaxScheme", List.of(Map.of("ID", val(TAX_SCHEME_ID,
                        Map.of("schemeAgencyID", TAX_SCHEME_AGENCY_ID, "schemeID", TAX_SCHEME_SCHEME_ID))))
        );
    }

    private Map<String, Object> legalMonetaryTotal(MappedInvoice invoice, BigDecimal subtotal,
                                                     BigDecimal grandTotal, String currency) {
        BigDecimal discount = invoice.getDiscountTotal() != null ? invoice.getDiscountTotal() : BigDecimal.ZERO;
        Map<String, Object> total = new LinkedHashMap<>();
        total.put("LineExtensionAmount", val(subtotal, Map.of("currencyID", currency)));
        total.put("TaxExclusiveAmount", val(subtotal, Map.of("currencyID", currency)));
        total.put("TaxInclusiveAmount", val(grandTotal, Map.of("currencyID", currency)));
        total.put("AllowanceTotalAmount", val(discount, Map.of("currencyID", currency)));
        total.put("ChargeTotalAmount", val(BigDecimal.ZERO, Map.of("currencyID", currency)));
        total.put("PayableRoundingAmount", val(BigDecimal.ZERO, Map.of("currencyID", currency)));
        total.put("PayableAmount", val(grandTotal, Map.of("currencyID", currency)));
        return total;
    }

    private Map<String, Object> invoiceLine(MappedInvoiceLineItem item, String currency) {
        BigDecimal quantity = nz(item.getQuantity());
        BigDecimal unitPrice = nz(item.getUnitPrice());
        BigDecimal taxAmount = nz(item.getTaxAmount());
        // Deterministic multiplication done by the app, not the AI — safe, unlike the AI-side
        // "no arithmetic" rule, which exists because the model can't reliably do this token-by-token.
        BigDecimal lineExtensionAmount = quantity.multiply(unitPrice).setScale(2, RoundingMode.HALF_UP);

        Map<String, Object> line = new LinkedHashMap<>();
        put(line, "ID", val(item.getLineNo()));
        put(line, "InvoicedQuantity", val(quantity, Map.of("unitCode", item.getUnitCode() != null ? item.getUnitCode() : "C62")));
        put(line, "LineExtensionAmount", val(lineExtensionAmount, Map.of("currencyID", currency)));

        Map<String, Object> itemNode = new LinkedHashMap<>();
        put(itemNode, "Description", val(item.getDescription()));
        if (item.getClassificationCode() != null && !item.getClassificationCode().isBlank()) {
            put(itemNode, "CommodityClassification", List.of(Map.of(
                    "ItemClassificationCode", val(item.getClassificationCode(), Map.of("listID", "CLASS")))));
        }
        put(line, "Item", List.of(itemNode));

        put(line, "Price", List.of(Map.of("PriceAmount", val(unitPrice, Map.of("currencyID", currency)))));
        put(line, "TaxTotal", List.of(Map.of(
                "TaxAmount", val(taxAmount, Map.of("currencyID", currency)),
                "TaxSubtotal", List.of(Map.of(
                        "TaxableAmount", val(lineExtensionAmount, Map.of("currencyID", currency)),
                        "TaxAmount", val(taxAmount, Map.of("currencyID", currency)),
                        "TaxCategory", List.of(taxCategory())
                ))
        )));
        return line;
    }

    // --- small wrapper helpers matching the reference's {"_": value, ...attrs} leaf shape ---

    private List<Map<String, Object>> val(Object value) {
        if (value == null) {
            return null;
        }
        Map<String, Object> node = new LinkedHashMap<>();
        node.put("_", value);
        return List.of(node);
    }

    private List<Map<String, Object>> val(Object value, Map<String, Object> attrs) {
        if (value == null) {
            return null;
        }
        Map<String, Object> node = new LinkedHashMap<>();
        node.put("_", value);
        node.putAll(attrs);
        return List.of(node);
    }

    private void put(Map<String, Object> target, String key, Object value) {
        if (value != null) {
            target.put(key, value);
        }
    }

    private String nullToEmpty(String value) {
        return value == null ? "" : value;
    }

    private BigDecimal nz(BigDecimal value) {
        return value != null ? value : BigDecimal.ZERO;
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
