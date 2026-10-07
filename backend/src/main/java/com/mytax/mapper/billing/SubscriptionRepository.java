package com.mytax.mapper.billing;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SubscriptionRepository extends JpaRepository<Subscription, Long> {

    Optional<Subscription> findFirstByBillplzBillId(String billplzBillId);

    Optional<Subscription> findFirstByUserIdAndStatusOrderByIdDesc(Long userId, SubscriptionStatus status);

    List<Subscription> findByUserIdAndStatus(Long userId, SubscriptionStatus status);
}
