package com.mytax.mapper.consolidation;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ConsolidatedInvoiceTransactionRepository extends JpaRepository<ConsolidatedInvoiceTransaction, Long> {

    List<ConsolidatedInvoiceTransaction> findByConsolidatedInvoiceId(Long consolidatedInvoiceId);

    boolean existsBySalesTransactionId(Long salesTransactionId);
}
