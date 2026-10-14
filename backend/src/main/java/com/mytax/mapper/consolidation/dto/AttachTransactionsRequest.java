package com.mytax.mapper.consolidation.dto;

import jakarta.validation.constraints.NotEmpty;

import java.util.List;

public record AttachTransactionsRequest(@NotEmpty List<Long> transactionIds) {
}
