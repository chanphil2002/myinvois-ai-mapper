package com.mytax.mapper.billing.dto;

import com.mytax.mapper.billing.SubscriptionStatus;

import java.time.Instant;

/** The user's current subscription, or null when they have none. */
public record SubscriptionResponse(
        String plan,
        String planName,
        SubscriptionStatus status,
        int amountCents,
        Instant paidAt
) {
}
