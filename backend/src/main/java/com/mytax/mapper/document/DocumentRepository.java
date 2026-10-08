package com.mytax.mapper.document;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.List;

public interface DocumentRepository extends JpaRepository<Document, Long> {

    List<Document> findByUserIdOrderByUploadedAtDesc(Long userId);

    /** Counts a user's real (non-manual) uploads since a cut-off — used for the free-tier daily cap. */
    long countByUserIdAndStatusNotAndUploadedAtAfter(Long userId, DocumentStatus status, Instant after);
}
