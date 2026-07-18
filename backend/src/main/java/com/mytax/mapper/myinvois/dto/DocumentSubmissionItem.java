package com.mytax.mapper.myinvois.dto;

/**
 * Mirrors the "documents[]" entry of POST /api/v1.0/documentsubmissions.
 * {@code document} is base64-encoded UBL (XML or JSON), {@code documentHash} is
 * the SHA-256 hex digest of the raw (pre-base64) document content.
 */
public record DocumentSubmissionItem(
        String format,
        String documentHash,
        String codeNumber,
        String document
) {
}
