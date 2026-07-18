package com.mytax.mapper.invoice;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SubmissionRepository extends JpaRepository<Submission, Long> {

    List<Submission> findByMappedInvoiceId(Long mappedInvoiceId);

    Optional<Submission> findByMyInvoisSubmissionUid(String submissionUid);
}
