package com.mytax.mapper.invoice;

/**
 * A built MyInvois "document" + "documentHash" pair, ready to hand to
 * {@link SubmissionService#submitBuiltDocument}. Shared return type for both
 * {@link UblDocumentBuilder} (individual invoices) and {@link ConsolidatedUblDocumentBuilder}
 * (consolidated invoices) so the submission call site doesn't need to know which kind built it.
 */
public record BuiltDocument(String base64Document, String sha256Hash, String codeNumber) {
}
