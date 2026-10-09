package com.mytax.mapper.usage.dto;

/** Server-computed AI parsing usage for the current billing period. */
public record UsageResponse(
        String plan,
        String planName,
        boolean free,
        long used,
        long limit,
        long remaining,
        String periodLabel
) {
}
