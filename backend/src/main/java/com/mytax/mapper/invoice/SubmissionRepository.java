package com.mytax.mapper.invoice;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SubmissionRepository extends JpaRepository<Submission, Long> {

    List<Submission> findByMappedInvoiceId(Long mappedInvoiceId);

    List<Submission> findByConsolidatedInvoiceId(Long consolidatedInvoiceId);

    Optional<Submission> findByMyInvoisSubmissionUid(String submissionUid);

    /** Submissions still awaiting LHDN's verdict — polled in the background. */
    List<Submission> findByStatusInAndSubmittedAtAfter(java.util.Collection<SubmissionStatus> statuses, java.time.Instant after);
}
