package com.mytax.mapper.billing;

public enum SubscriptionStatus {
    /** Checkout started, Billplz bill created, awaiting payment. */
    PENDING,
    /** Paid and current. */
    ACTIVE,
    /** Superseded by a newer subscription, or cancelled. */
    CANCELLED
}
