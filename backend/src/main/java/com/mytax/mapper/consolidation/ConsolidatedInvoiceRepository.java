package com.mytax.mapper.consolidation;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ConsolidatedInvoiceRepository extends JpaRepository<ConsolidatedInvoice, Long> {

    List<ConsolidatedInvoice> findByUserIdOrderByCreatedAtDesc(Long userId);

    /** Not yet submitted (deadline reminders). */
    List<ConsolidatedInvoice> findByStatusIn(java.util.Collection<ConsolidatedInvoiceStatus> statuses);
}
