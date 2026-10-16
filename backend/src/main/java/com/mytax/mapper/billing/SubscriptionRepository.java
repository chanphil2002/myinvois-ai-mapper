package com.mytax.mapper.billing;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SubscriptionRepository extends JpaRepository<Subscription, Long> {

    Optional<Subscription> findFirstByBillplzBillId(String billplzBillId);

    Optional<Subscription> findFirstByUserIdAndStatusOrderByIdDesc(Long userId, SubscriptionStatus status);

    List<Subscription> findByUserIdAndStatus(Long userId, SubscriptionStatus status);

    /** Active, non-renewing plans ending in the window — expiry reminders. */
    List<Subscription> findByStatusAndAutoRenewFalseAndPeriodEndBetween(SubscriptionStatus status, java.time.Instant from, java.time.Instant to);
}
