package com.mytax.mapper.referral;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface CommissionRepository extends JpaRepository<Commission, Long> {

    boolean existsByPaymentRef(String paymentRef);

    List<Commission> findAllByOrderByCreatedAtDescIdDesc();

    List<Commission> findByStatusOrderByCreatedAtDescIdDesc(Commission.Status status);

    @Query("select coalesce(sum(c.amountCents), 0) from Commission c where c.status = :status")
    long sumAmountByStatus(Commission.Status status);

    @Query("select coalesce(sum(c.amountCents), 0) from Commission c where c.salespersonId = :salespersonId and c.status = :status")
    long sumAmountBySalespersonAndStatus(Long salespersonId, Commission.Status status);
}
