package com.mytax.mapper.mapping.dto;

import com.mytax.mapper.mapping.InvoiceStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record MappedInvoiceResponse(
        Long id,
        Long documentId,
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
        InvoiceStatus status,
        BigDecimal confidenceScore,
        List<LineItemResponse> lineItems
) {
    public record LineItemResponse(
            Long id,
            Integer lineNo,
            String description,
            BigDecimal quantity,
            BigDecimal unitPrice,
            BigDecimal taxAmount,
            String classificationCode,
            BigDecimal confidenceScore
    ) {
    }
}
