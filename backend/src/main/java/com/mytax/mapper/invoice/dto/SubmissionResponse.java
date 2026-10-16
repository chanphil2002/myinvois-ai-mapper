package com.mytax.mapper.invoice.dto;

import com.mytax.mapper.invoice.SubmissionStatus;

import java.time.Instant;

public record SubmissionResponse(
        Long id,
        Long mappedInvoiceId,
        Long consolidatedInvoiceId,
        String myInvoisSubmissionUid,
        String myInvoisDocumentUuid,
        SubmissionStatus status,
        Instant submittedAt,
        Instant statusUpdatedAt,
        String errorMessage,
        com.mytax.mapper.myinvois.MyInvoisEnvironment environment,
        /** Document ID sent to LHDN (INV-12 / INV-12-R2). */
        String internalId,
        Instant validatedAt,
        /** Last moment the issuer may cancel at LHDN (validatedAt + 72h); null if not Valid. */
        Instant cancellableUntil,
        Instant cancelledAt,
        String cancelReason
) {
}
