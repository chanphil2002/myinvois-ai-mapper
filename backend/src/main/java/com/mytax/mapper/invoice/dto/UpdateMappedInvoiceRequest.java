package com.mytax.mapper.invoice.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/** Full replace of the editable fields on a mapped invoice — sent when the user edits the review table. */
public record UpdateMappedInvoiceRequest(
        String invoiceTypeCode,
        LocalDate issueDate,
        String currencyCode,
        String supplierTin,
        String supplierName,
        String buyerTin,
        String buyerName,
        String buyerIdType,
        String buyerIdValue,
        String buyerSst,
        String buyerAddressLine1,
        String buyerAddressLine2,
        String buyerCity,
        String buyerPostalZone,
        String buyerStateCode,
        String buyerCountryCode,
        String buyerPhone,
        String buyerEmail,
        BigDecimal subtotal,
        BigDecimal taxTotal,
        BigDecimal grandTotal,
        BigDecimal discountTotal,
        List<LineItem> lineItems
) {
    public record LineItem(
            Long id,
            String description,
            BigDecimal quantity,
            BigDecimal unitPrice,
            BigDecimal taxAmount,
            String classificationCode,
            String unitCode
    ) {
    }
}
