package com.mytax.mapper.consolidation.dto;

import com.mytax.mapper.consolidation.ConsolidationBatchStatus;
import com.mytax.mapper.mapping.dto.MappedInvoiceResponse;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public record ConsolidationBatchResponse(
        Long id,
        Integer periodYear,
        Integer periodMonth,
        ConsolidationBatchStatus status,
        Instant createdAt,
        Instant generatedAt,
        List<MappedInvoiceResponse> items,
        BigDecimal itemsTotal,
        MappedInvoiceResponse resultInvoice
) {
}
