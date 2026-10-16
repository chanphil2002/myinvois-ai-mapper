package com.mytax.mapper.billing;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PaymentRepository extends JpaRepository<Payment, Long> {

    boolean existsByProviderRef(String providerRef);

    List<Payment> findByUserIdOrderByPaidAtDesc(Long userId);
}
