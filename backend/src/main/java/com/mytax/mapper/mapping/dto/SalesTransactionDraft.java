package com.mytax.mapper.mapping.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Shape an AI engine returns for one extracted sales transaction (consolidated-mode extraction —
 * see {@code MappingEngine.mapTransactions}). Unlike {@link MappedInvoiceDraft}, this represents
 * a single small transaction (e.g. one spreadsheet row), not a whole invoice with line items.
 */
public record SalesTransactionDraft(
        LocalDate transactionDate,
        String description,
        BigDecimal quantity,
        BigDecimal unitPrice,
        BigDecimal taxAmount,
        String classificationCode,
        String unitCode,
        String buyerName,
        String buyerTin,
        BigDecimal confidenceScore
) {
}
