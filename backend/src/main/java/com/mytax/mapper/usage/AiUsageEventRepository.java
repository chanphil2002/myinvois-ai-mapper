package com.mytax.mapper.usage;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;

public interface AiUsageEventRepository extends JpaRepository<AiUsageEvent, Long> {

    long countByUserIdAndCreatedAtAfter(Long userId, Instant after);
}
