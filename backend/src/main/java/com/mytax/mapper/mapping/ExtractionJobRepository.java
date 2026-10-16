package com.mytax.mapper.mapping;

import org.springframework.data.jpa.repository.JpaRepository;

public interface ExtractionJobRepository extends JpaRepository<ExtractionJob, Long> {

    void deleteByDocumentId(Long documentId);

    java.util.Optional<ExtractionJob> findTopByDocumentIdOrderByIdDesc(Long documentId);
}
