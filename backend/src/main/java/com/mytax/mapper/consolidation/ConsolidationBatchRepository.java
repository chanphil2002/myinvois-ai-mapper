package com.mytax.mapper.consolidation;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ConsolidationBatchRepository extends JpaRepository<ConsolidationBatch, Long> {

    Optional<ConsolidationBatch> findByUserIdAndPeriodYearAndPeriodMonth(Long userId, Integer periodYear, Integer periodMonth);

    List<ConsolidationBatch> findByUserIdOrderByPeriodYearDescPeriodMonthDesc(Long userId);
}
