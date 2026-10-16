package com.mytax.mapper.billing.dto;

import java.time.Instant;

public record PaymentResponse(Long id, String description, int amountCents, String provider, String receiptUrl,
                              Instant paidAt) {
}
