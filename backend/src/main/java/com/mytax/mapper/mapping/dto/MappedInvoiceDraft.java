package com.mytax.mapper.mapping.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * Shape the AI mapping engine must return (mirrors the Claude tool_use input schema
 * in {@code ClaudeMappingService}). Field names map 1:1 onto {@code MappedInvoice}.
 */
public record MappedInvoiceDraft(
        String invoiceTypeCode,
        LocalDate issueDate,
        String currencyCode,
        String supplierTin,
        String supplierName,
        String buyerTin,
        String buyerName,
        BigDecimal subtotal,
        BigDecimal taxTotal,
        BigDecimal grandTotal,
        BigDecimal confidenceScore,
        List<LineItemDraft> lineItems
) {
    public record LineItemDraft(
            String description,
            BigDecimal quantity,
            BigDecimal unitPrice,
            BigDecimal taxAmount,
            String classificationCode,
            BigDecimal confidenceScore
    ) {
    }
}
