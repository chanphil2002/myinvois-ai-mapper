package com.mytax.mapper.invoice;

import com.mytax.mapper.profile.BusinessProfile;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

/**
 * Shared UBL-as-JSON building blocks used by both {@link UblDocumentBuilder} (individual
 * e-invoices) and {@code com.mytax.mapper.consolidation.ConsolidatedUblDocumentBuilder}
 * (consolidated e-invoices). Both document kinds share the same supplier (always the
 * account's {@link BusinessProfile}), the same tax category/scheme, and the same UBL root/leaf
 * wrapper shape — this class is where that shared logic lives so it's written once.
 *
 * See {@link UblDocumentBuilder}'s class comment for the provenance of the field shape and
 * known gaps (no digital signature, etc.) — they apply equally to documents built with this class.
 */
@Component
public class UblJsonSupport {

    public static final String TAX_CATEGORY_STANDARD = "01";
    public static final String TAX_SCHEME_ID = "OTH";
    public static final String TAX_SCHEME_AGENCY_ID = "6";
    public static final String TAX_SCHEME_SCHEME_ID = "UN/ECE 5153";

    private static final Pattern NUMERIC_STATE_CODE = Pattern.compile("\\d{2}");

    // LHDN e-Invoice CountrySubentityCode values — mirrors frontend/src/constants/malaysiaStates.ts.
    // Buyer state is stored as the AI-extracted free-text name (it isn't allowed to guess a numeric
    // code); this is the single point where that name gets converted to the code LHDN actually
    // requires, so it applies regardless of whether the reviewer touched the state field in the UI.
    private static final Map<String, String> STATE_NAME_TO_CODE = Map.ofEntries(
            Map.entry("johor", "01"),
            Map.entry("kedah", "02"),
            Map.entry("kelantan", "03"),
            Map.entry("melaka", "04"),
            Map.entry("negeri sembilan", "05"),
            Map.entry("pahang", "06"),
            Map.entry("pulau pinang", "07"),
            Map.entry("perak", "08"),
            Map.entry("perlis", "09"),
            Map.entry("selangor", "10"),
            Map.entry("terengganu", "11"),
            Map.entry("sabah", "12"),
            Map.entry("sarawak", "13"),
            Map.entry("wp kuala lumpur", "14"),
            Map.entry("wp labuan", "15"),
            Map.entry("wp putrajaya", "16"),
            Map.entry("not applicable", "17")
    );

    public Map<String, Object> wrapRoot(Map<String, Object> invoiceNode) {
        Map<String, Object> root = new LinkedHashMap<>();
        root.put("_D", "urn:oasis:names:specification:ubl:schema:xsd:Invoice-2");
        root.put("_A", "urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2");
        root.put("_B", "urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2");
        root.put("Invoice", List.of(invoiceNode));
        return root;
    }

    public Map<String, Object> supplierParty(BusinessProfile supplier) {
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

    public void addIdentification(List<Map<String, Object>> target, String schemeId, String value) {
        if (schemeId == null || value == null || value.isBlank()) {
            return;
        }
        target.add(Map.of("ID", val(value, Map.of("schemeID", schemeId))));
    }

    public Map<String, Object> postalAddress(String city, String postalZone, String stateCode,
                                              String addressLine1, String addressLine2, String countryCode) {
        Map<String, Object> address = new LinkedHashMap<>();
        put(address, "CityName", val(city));
        put(address, "PostalZone", val(postalZone));
        put(address, "CountrySubentityCode", val(normalizeStateCode(stateCode)));

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

    /**
     * Accepts either an already-correct numeric code (e.g. from {@link BusinessProfile}, entered
     * via a Select) or a free-text state name (e.g. from AI-extracted buyer data) and returns the
     * numeric LHDN code either way. Falls back to the input unchanged if it's neither — better to
     * send LHDN's own rejection reason for a genuinely unrecognized value than silently drop it.
     */
    private String normalizeStateCode(String stateCode) {
        if (stateCode == null || stateCode.isBlank()) {
            return null;
        }
        String trimmed = stateCode.trim();
        if (NUMERIC_STATE_CODE.matcher(trimmed).matches()) {
            return trimmed;
        }
        return STATE_NAME_TO_CODE.getOrDefault(trimmed.toLowerCase(), trimmed);
    }

    public List<Map<String, Object>> contact(String phone, String email) {
        if ((phone == null || phone.isBlank()) && (email == null || email.isBlank())) {
            return null;
        }
        Map<String, Object> contact = new LinkedHashMap<>();
        put(contact, "Telephone", val(phone));
        put(contact, "ElectronicMail", val(email));
        return List.of(contact);
    }

    public Map<String, Object> taxCategory() {
        return Map.of(
                "ID", val(TAX_CATEGORY_STANDARD),
                "TaxScheme", List.of(Map.of("ID", val(TAX_SCHEME_ID,
                        Map.of("schemeAgencyID", TAX_SCHEME_AGENCY_ID, "schemeID", TAX_SCHEME_SCHEME_ID))))
        );
    }

    public Map<String, Object> taxTotalNode(BigDecimal taxTotal, BigDecimal subtotal, String currency) {
        return Map.of(
                "TaxAmount", val(taxTotal, Map.of("currencyID", currency)),
                "TaxSubtotal", List.of(Map.of(
                        "TaxableAmount", val(subtotal, Map.of("currencyID", currency)),
                        "TaxAmount", val(taxTotal, Map.of("currencyID", currency)),
                        "TaxCategory", List.of(taxCategory())
                ))
        );
    }

    public Map<String, Object> legalMonetaryTotal(BigDecimal discount, BigDecimal subtotal,
                                                    BigDecimal grandTotal, String currency) {
        Map<String, Object> total = new LinkedHashMap<>();
        total.put("LineExtensionAmount", val(subtotal, Map.of("currencyID", currency)));
        total.put("TaxExclusiveAmount", val(subtotal, Map.of("currencyID", currency)));
        total.put("TaxInclusiveAmount", val(grandTotal, Map.of("currencyID", currency)));
        total.put("AllowanceTotalAmount", val(nz(discount), Map.of("currencyID", currency)));
        total.put("ChargeTotalAmount", val(BigDecimal.ZERO, Map.of("currencyID", currency)));
        total.put("PayableRoundingAmount", val(BigDecimal.ZERO, Map.of("currencyID", currency)));
        total.put("PayableAmount", val(grandTotal, Map.of("currencyID", currency)));
        return total;
    }

    /** Shared per-line UBL structure — callers extract these primitives from whatever entity they have. */
    public Map<String, Object> invoiceLine(int lineNo, String description, BigDecimal quantity, BigDecimal unitPrice,
                                            BigDecimal taxAmount, String unitCode, String classificationCode,
                                            String currency) {
        BigDecimal q = nz(quantity);
        BigDecimal price = nz(unitPrice);
        BigDecimal tax = nz(taxAmount);
        // Deterministic multiplication done by the app, not the AI — safe, unlike the AI-side
        // "no arithmetic" rule, which exists because the model can't reliably do this token-by-token.
        BigDecimal lineExtensionAmount = q.multiply(price).setScale(2, RoundingMode.HALF_UP);

        Map<String, Object> line = new LinkedHashMap<>();
        // LHDN requires InvoiceLine.ID as a string (StringExpected); emit "1", not the number 1.
        put(line, "ID", val(Integer.toString(lineNo)));
        put(line, "InvoicedQuantity", val(q, Map.of("unitCode", unitCode != null ? unitCode : "C62")));
        put(line, "LineExtensionAmount", val(lineExtensionAmount, Map.of("currencyID", currency)));

        Map<String, Object> itemNode = new LinkedHashMap<>();
        put(itemNode, "Description", val(description));
        if (classificationCode != null && !classificationCode.isBlank()) {
            put(itemNode, "CommodityClassification", List.of(Map.of(
                    "ItemClassificationCode", val(classificationCode, Map.of("listID", "CLASS")))));
        }
        put(line, "Item", List.of(itemNode));

        put(line, "Price", List.of(Map.of("PriceAmount", val(price, Map.of("currencyID", currency)))));
        // LHDN core field CF411: ItemPriceExtension.Amount is required and equals the line's
        // extension amount (quantity x unit price).
        put(line, "ItemPriceExtension", List.of(Map.of(
                "Amount", val(lineExtensionAmount, Map.of("currencyID", currency)))));
        put(line, "TaxTotal", List.of(Map.of(
                "TaxAmount", val(tax, Map.of("currencyID", currency)),
                "TaxSubtotal", List.of(Map.of(
                        "TaxableAmount", val(lineExtensionAmount, Map.of("currencyID", currency)),
                        "TaxAmount", val(tax, Map.of("currencyID", currency)),
                        "TaxCategory", List.of(taxCategory())
                ))
        )));
        return line;
    }

    // --- generic leaf / null-safety helpers, matching the reference's {"_": value, ...attrs} leaf shape ---

    public List<Map<String, Object>> val(Object value) {
        if (value == null) {
            return null;
        }
        Map<String, Object> node = new LinkedHashMap<>();
        node.put("_", value);
        return List.of(node);
    }

    public List<Map<String, Object>> val(Object value, Map<String, Object> attrs) {
        if (value == null) {
            return null;
        }
        Map<String, Object> node = new LinkedHashMap<>();
        node.put("_", value);
        node.putAll(attrs);
        return List.of(node);
    }

    public void put(Map<String, Object> target, String key, Object value) {
        if (value != null) {
            target.put(key, value);
        }
    }

    public String nullToEmpty(String value) {
        return value == null ? "" : value;
    }

    public BigDecimal nz(BigDecimal value) {
        return value != null ? value : BigDecimal.ZERO;
    }

    public String sha256Hex(String content) {
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
