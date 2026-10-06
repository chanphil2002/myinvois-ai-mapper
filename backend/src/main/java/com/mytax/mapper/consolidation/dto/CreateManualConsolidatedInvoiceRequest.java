package com.mytax.mapper.consolidation.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * Manually keyed-in consolidated e-invoice: a period plus the individual B2C sale lines. The
 * backend creates the backing (synthetic) transactions and a DRAFT consolidated invoice in one step.
 */
public record CreateManualConsolidatedInvoiceRequest(
        @NotNull LocalDate periodStart,
        @NotNull LocalDate periodEnd,
        @NotEmpty List<LineItem> lineItems
) {
    public record LineItem(
            LocalDate transactionDate,
            String description,
            BigDecimal quantity,
            BigDecimal unitPrice,
            BigDecimal taxAmount,
            String unitCode
    ) {
    }
}
