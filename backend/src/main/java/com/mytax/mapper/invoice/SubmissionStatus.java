package com.mytax.mapper.invoice;

public enum SubmissionStatus {
    PENDING,
    IN_PROGRESS,
    VALID,
    INVALID,
    PARTIALLY_VALID,
    /** Cancelled at LHDN by the issuer (within 72 hours of validation). */
    CANCELLED
}
