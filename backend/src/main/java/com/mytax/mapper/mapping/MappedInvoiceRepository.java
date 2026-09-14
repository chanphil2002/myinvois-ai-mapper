package com.mytax.mapper.mapping;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface MappedInvoiceRepository extends JpaRepository<MappedInvoice, Long> {

    List<MappedInvoice> findByDocumentId(Long documentId);

    /**
     * Ownership is resolved by document, not a direct user_id column (see InvoiceReviewService),
     * so eligibility checks for consolidation go through the caller's document ids rather than a
     * join — consistent with the rest of this codebase, which never uses JPA entity associations.
     */
    List<MappedInvoice> findByDocumentIdIn(List<Long> documentIds);

    // "ConsolidationResult" (not "IsConsolidationResult") — Spring Data's method-name parser
    // otherwise treats the leading "Is" as the comparison keyword and looks for a property
    // literally named "isConsolidationResult", which doesn't exist (the boolean field is
    // "consolidationResult"; "is" is just its JavaBean getter prefix).
    List<MappedInvoice> findByConsolidationBatchIdAndConsolidationResultFalse(Long consolidationBatchId);

    Optional<MappedInvoice> findByConsolidationBatchIdAndConsolidationResultTrue(Long consolidationBatchId);
}
