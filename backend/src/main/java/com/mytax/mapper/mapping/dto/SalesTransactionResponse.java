package com.mytax.mapper.mapping.dto;

import com.mytax.mapper.mapping.SalesTransactionStatus;

import java.math.BigDecimal;
import java.time.LocalDate;

public record SalesTransactionResponse(
        Long id,
        Long documentId,
        LocalDate transactionDate,
        String description,
        BigDecimal quantity,
        BigDecimal unitPrice,
        BigDecimal taxAmount,
        String classificationCode,
        String unitCode,
        String buyerName,
        String buyerTin,
        boolean eligibleForConsolidation,
        SalesTransactionStatus status,
        BigDecimal confidenceScore
) {
}
