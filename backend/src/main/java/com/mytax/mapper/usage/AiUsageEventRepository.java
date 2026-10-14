package com.mytax.mapper.usage;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.math.BigDecimal;
import java.time.Instant;

public interface AiUsageEventRepository extends JpaRepository<AiUsageEvent, Long> {

    long countByUserIdAndCreatedAtAfter(Long userId, Instant after);

    /** Metered cost of every AI call since {@code after} (rows that carry token data). */
    @Query("select coalesce(sum(e.costUsd), 0) from AiUsageEvent e where e.userId = :userId and e.createdAt > :after and e.costUsd is not null")
    BigDecimal sumCostSince(Long userId, Instant after);

    /** Pre-metering rows (no token data) — each counts as one typical parse. */
    @Query("select count(e) from AiUsageEvent e where e.userId = :userId and e.createdAt > :after and e.costUsd is null")
    long countUnmeteredSince(Long userId, Instant after);
}
