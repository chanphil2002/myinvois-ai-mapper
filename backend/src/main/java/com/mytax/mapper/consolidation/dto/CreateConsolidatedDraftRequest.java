package com.mytax.mapper.consolidation.dto;

import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

/** Starts an empty DRAFT consolidated invoice (name + period); sales are added afterwards. */
public record CreateConsolidatedDraftRequest(
        String invoiceName,
        @NotNull LocalDate periodStart,
        @NotNull LocalDate periodEnd
) {
}
