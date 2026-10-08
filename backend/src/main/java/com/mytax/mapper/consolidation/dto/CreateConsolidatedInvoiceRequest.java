package com.mytax.mapper.consolidation.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.util.List;

public record CreateConsolidatedInvoiceRequest(
        @NotEmpty List<Long> transactionIds,
        @NotNull LocalDate periodStart,
        @NotNull LocalDate periodEnd
) {
}
