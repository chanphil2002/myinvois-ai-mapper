package com.mytax.mapper.mapping;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MappedInvoiceLineItemRepository extends JpaRepository<MappedInvoiceLineItem, Long> {

    List<MappedInvoiceLineItem> findByMappedInvoiceIdOrderByLineNo(Long mappedInvoiceId);
}
