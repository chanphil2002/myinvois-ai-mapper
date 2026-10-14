package com.mytax.mapper.usage.dto;

/**
 * Server-computed AI usage for the current period (a day on the free tier, a month on paid plans),
 * metered by actual token cost rather than a flat count of parses.
 */
public record UsageResponse(
        String plan,
        String planName,
        boolean free,
        /** Share of the period's allowance used, e.g. 37.5 (can exceed 100 by the last call). */
        double usedPercent,
        /** Roughly how many more typical documents fit in what's left. */
        long typicalDocumentsLeft,
        /** The allowance expressed as typical documents (e.g. 500). */
        int allowanceTypicalDocuments,
        String periodLabel
) {
}
