package com.mytax.mapper.mapping;

public enum InvoiceStatus {
    DRAFT,
    CONFIRMED,
    SUBMITTED,
    ACCEPTED,
    REJECTED,
    /** Pulled into an open consolidation batch — locked out of individual confirm/submit until the batch is deleted or the invoice is removed from it. */
    CONSOLIDATED
}
