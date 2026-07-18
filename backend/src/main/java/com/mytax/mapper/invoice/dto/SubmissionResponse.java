package com.mytax.mapper.invoice.dto;

import com.mytax.mapper.invoice.SubmissionStatus;

import java.time.Instant;

public record SubmissionResponse(
        Long id,
        Long mappedInvoiceId,
        String myInvoisSubmissionUid,
        String myInvoisDocumentUuid,
        SubmissionStatus status,
        Instant submittedAt,
        Instant statusUpdatedAt
) {
}
