package com.mytax.mapper.billing;

public enum SubscriptionStatus {
    /** Checkout started, awaiting payment. */
    PENDING,
    /** Paid and current. */
    ACTIVE,
    /** Superseded by a newer subscription, or cancelled. */
    CANCELLED,
    /** The paid period ended without renewal. */
    EXPIRED
}
