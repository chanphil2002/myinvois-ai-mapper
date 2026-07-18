package com.mytax.mapper.mapping;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MappedInvoiceRepository extends JpaRepository<MappedInvoice, Long> {

    List<MappedInvoice> findByDocumentId(Long documentId);
}
