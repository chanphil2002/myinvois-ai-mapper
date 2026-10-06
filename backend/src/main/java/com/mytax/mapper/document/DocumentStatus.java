package com.mytax.mapper.document;

public enum DocumentStatus {
    UPLOADED,
    PARSING,
    PARSED,
    FAILED,
    /** Placeholder document backing a manually keyed-in invoice/transactions (no uploaded file). */
    MANUAL
}
