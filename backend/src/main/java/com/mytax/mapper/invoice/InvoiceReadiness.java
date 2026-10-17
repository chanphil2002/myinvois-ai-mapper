package com.mytax.mapper.invoice;

import com.mytax.mapper.mapping.MappedInvoice;
import com.mytax.mapper.mapping.MappedInvoiceLineItem;
import com.mytax.mapper.profile.BusinessProfile;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

/**
 * The LHDN-mandatory fields an individual e-invoice (or credit note) needs before it can move to
 * "Reviewing" (CONFIRMED). Mirrors MyInvois' mandatory-field list for the invoice, buyer, supplier
 * (the user's business profile) and line items. Keep in sync with the frontend checklist
 * ({@code utils/invoiceReadiness.ts}).
 */
public final class InvoiceReadiness {

    private InvoiceReadiness() {
    }

    /** Human-readable list of what's missing; empty when the invoice is ready. */
    public static List<String> missing(MappedInvoice inv, List<MappedInvoiceLineItem> lines, BusinessProfile supplier) {
        List<String> m = new ArrayList<>();
        // Invoice
        req(m, inv.getInvoiceTypeCode(), "Invoice type code");
        req(m, inv.getCurrencyCode(), "Currency");
        // Buyer
        req(m, inv.getBuyerName(), "Buyer name");
        req(m, inv.getBuyerTin(), "Buyer TIN");
        req(m, inv.getBuyerIdType(), "Buyer ID type");
        req(m, inv.getBuyerIdValue(), "Buyer ID number");
        req(m, inv.getBuyerSst(), "Buyer SST no. (enter NA if not registered)");
        req(m, inv.getBuyerAddressLine1(), "Buyer address");
        req(m, inv.getBuyerCity(), "Buyer city");
        req(m, inv.getBuyerStateCode(), "Buyer state");
        req(m, inv.getBuyerCountryCode(), "Buyer country");
        req(m, inv.getBuyerPhone(), "Buyer phone");
        // Line items
        if (lines.isEmpty()) {
            m.add("At least one line item");
        }
        for (MappedInvoiceLineItem li : lines) {
            String n = "Line " + li.getLineNo() + " ";
            req(m, li.getDescription(), n + "description");
            if (li.getQuantity() == null || li.getQuantity().signum() <= 0) m.add(n + "quantity above 0");
            if (li.getUnitPrice() == null || li.getUnitPrice().signum() < 0) m.add(n + "unit price");
            req(m, li.getClassificationCode(), n + "classification");
        }
        // Totals
        if (inv.getGrandTotal() == null || inv.getGrandTotal().compareTo(BigDecimal.ZERO) <= 0) {
            m.add("A grand total above RM 0 (add line items with prices)");
        }
        // Supplier = the user's business profile
        if (supplier == null) {
            m.add("Your business profile (Settings)");
        } else {
            req(m, supplier.getRegistrationName(), "Supplier registration name (Settings)");
            req(m, supplier.getTin(), "Supplier TIN (Settings)");
            req(m, supplier.getIdValue(), "Supplier ID number (Settings)");
            req(m, supplier.getMsicCode(), "Supplier MSIC code (Settings)");
            req(m, supplier.getMsicDescription(), "Supplier business activity (Settings)");
            req(m, supplier.getAddressLine1(), "Supplier address (Settings)");
            req(m, supplier.getCity(), "Supplier city (Settings)");
            req(m, supplier.getStateCode(), "Supplier state (Settings)");
            req(m, supplier.getPhone(), "Supplier phone (Settings)");
        }
        return m;
    }

    private static void req(List<String> missing, String value, String label) {
        if (value == null || value.isBlank()) {
            missing.add(label);
        }
    }
}
