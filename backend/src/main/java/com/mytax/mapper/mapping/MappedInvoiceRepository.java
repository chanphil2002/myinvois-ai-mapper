package com.mytax.mapper.mapping;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface MappedInvoiceRepository extends JpaRepository<MappedInvoice, Long> {

    List<MappedInvoice> findByDocumentId(Long documentId);

    /** All of a user's mapped invoices (ownership derived through the backing document), newest
     *  first. Includes manually-keyed invoices whose backing document is hidden from the doc list. */
    @Query("select mi from MappedInvoice mi where mi.documentId in "
            + "(select d.id from Document d where d.userId = :userId) order by mi.id desc")
    List<MappedInvoice> findAllForUser(@Param("userId") Long userId);
}
