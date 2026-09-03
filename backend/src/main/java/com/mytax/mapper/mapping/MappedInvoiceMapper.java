package com.mytax.mapper.mapping;

import com.mytax.mapper.mapping.dto.MappedInvoiceResponse;

import java.util.List;

/**
 * Entity -&gt; response mapping shared by every place that returns a {@link MappedInvoice}
 * (mapping, review, submission, consolidation) so the field list only has to be kept in sync
 * with {@link MappedInvoiceResponse} in one place.
 */
public final class MappedInvoiceMapper {

    private MappedInvoiceMapper() {
    }

    public static MappedInvoiceResponse toResponse(MappedInvoice invoice, List<MappedInvoiceLineItem> lineItems) {
        List<MappedInvoiceResponse.LineItemResponse> items = lineItems.stream()
                .map(li -> new MappedInvoiceResponse.LineItemResponse(li.getId(), li.getLineNo(), li.getDescription(),
                        li.getQuantity(), li.getUnitPrice(), li.getTaxAmount(), li.getClassificationCode(),
                        li.getUnitCode(), li.getConfidenceScore()))
                .toList();

        return new MappedInvoiceResponse(invoice.getId(), invoice.getDocumentId(), invoice.getInvoiceTypeCode(),
                invoice.getIssueDate(), invoice.getCurrencyCode(), invoice.getSupplierTin(), invoice.getSupplierName(),
                invoice.getBuyerTin(), invoice.getBuyerName(), invoice.getBuyerIdType(), invoice.getBuyerIdValue(),
                invoice.getBuyerSst(), invoice.getBuyerAddressLine1(), invoice.getBuyerAddressLine2(),
                invoice.getBuyerCity(), invoice.getBuyerPostalZone(), invoice.getBuyerStateCode(),
                invoice.getBuyerCountryCode(), invoice.getBuyerPhone(), invoice.getBuyerEmail(),
                invoice.getSubtotal(), invoice.getTaxTotal(), invoice.getGrandTotal(), invoice.getDiscountTotal(),
                invoice.getStatus(), invoice.getConfidenceScore(), items);
    }
}
