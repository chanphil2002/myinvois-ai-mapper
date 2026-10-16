package com.mytax.mapper.notification;

public enum NotificationType {
    /** LHDN validated a submitted e-invoice. */
    SUBMISSION_ACCEPTED,
    /** LHDN rejected a submitted e-invoice. */
    SUBMISSION_REJECTED,
    /** A paid plan is about to end and won't auto-renew. */
    SUBSCRIPTION_EXPIRING,
    /** A monthly consolidated e-invoice deadline is close (or passed). */
    CONSOLIDATED_DUE
}
