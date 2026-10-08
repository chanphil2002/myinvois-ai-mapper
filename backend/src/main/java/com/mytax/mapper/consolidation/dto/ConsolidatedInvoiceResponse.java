package com.mytax.mapper.consolidation.dto;

import com.mytax.mapper.consolidation.ConsolidatedInvoiceStatus;
import com.mytax.mapper.mapping.dto.SalesTransactionResponse;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public record ConsolidatedInvoiceResponse(
        Long id,
        LocalDate periodStart,
        LocalDate periodEnd,
        String invoiceTypeCode,
        String currencyCode,
        BigDecimal subtotal,
        BigDecimal taxTotal,
        BigDecimal grandTotal,
        ConsolidatedInvoiceStatus status,
        List<SalesTransactionResponse> transactions,
        Instant createdAt
) {
}
