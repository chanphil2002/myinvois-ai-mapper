package com.mytax.mapper.consolidation.dto;

import jakarta.validation.constraints.NotEmpty;

import java.util.List;

public record AddManualLinesRequest(@NotEmpty List<CreateManualConsolidatedInvoiceRequest.LineItem> lineItems) {
}
