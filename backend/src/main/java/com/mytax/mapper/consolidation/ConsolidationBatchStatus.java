package com.mytax.mapper.consolidation;

public enum ConsolidationBatchStatus {
    /** Collecting invoices; items can still be added or removed. */
    OPEN,
    /** The aggregate e-Invoice has been generated; membership is locked. */
    GENERATED
}
