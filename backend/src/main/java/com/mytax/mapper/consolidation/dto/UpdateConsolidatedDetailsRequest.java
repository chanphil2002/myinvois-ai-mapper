package com.mytax.mapper.consolidation.dto;

import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public record UpdateConsolidatedDetailsRequest(
        String invoiceName,
        @NotNull LocalDate periodStart,
        @NotNull LocalDate periodEnd
) {
}
