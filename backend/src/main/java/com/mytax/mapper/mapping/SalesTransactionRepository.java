package com.mytax.mapper.mapping;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SalesTransactionRepository extends JpaRepository<SalesTransaction, Long> {

    List<SalesTransaction> findByDocumentIdOrderByTransactionDate(Long documentId);

    /**
     * All PENDING (not yet grouped or excluded) transactions across every document uploaded by
     * a given user — the picker/preview grid for building a consolidated invoice.
     */
    @org.springframework.data.jpa.repository.Query("""
            select st from SalesTransaction st
            join Document d on d.id = st.documentId
            where d.userId = :userId and st.status = com.mytax.mapper.mapping.SalesTransactionStatus.PENDING
            order by st.transactionDate, st.id
            """)
    List<SalesTransaction> findEligibleForUser(Long userId);

    List<SalesTransaction> findByIdIn(List<Long> ids);
}
