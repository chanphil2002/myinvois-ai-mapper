package com.mytax.mapper.stats;

import java.util.List;

/** How the user's documents were turned into data: AI parsing (by file type) vs keyed in by hand. */
public record DocumentStatsResponse(
        /** Uploads AI parsed successfully / that failed. */
        long aiParsed,
        long aiFailed,
        /** Per file type: pdf, png, jpeg, csv, xlsx, other. */
        List<TypeCount> byType,
        /** Individual invoices and consolidated sales the AI produced. */
        long aiInvoices,
        long aiSales,
        /** Individual invoices and consolidated sales the user typed in (or imported from a CSV template). */
        long manualInvoices,
        long manualSales
) {
    public record TypeCount(String type, long parsed, long failed) {
    }
}
