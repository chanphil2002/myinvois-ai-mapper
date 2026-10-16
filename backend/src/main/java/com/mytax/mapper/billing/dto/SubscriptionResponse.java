package com.mytax.mapper.billing.dto;

import com.mytax.mapper.billing.SubscriptionStatus;

import java.time.Instant;

/** The user's current subscription, or null when they have none. */
public record SubscriptionResponse(
        String plan,
        String planName,
        SubscriptionStatus status,
        int amountCents,
        Instant paidAt,
        /** Access lasts until this moment. */
        Instant periodEnd,
        /** Stripe will charge again at periodEnd. */
        boolean autoRenew,
        /** Has a Stripe customer (card / billing details can be managed in the Stripe portal). */
        boolean canManageBilling,
        /** An auto-renewal set up to start when the current one-off period ends. */
        boolean renewalScheduled
) {
}
