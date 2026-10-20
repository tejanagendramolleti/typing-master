package com.examtyper.billing.repository;

import com.examtyper.billing.entity.Payment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PaymentRepository extends JpaRepository<Payment, Long> {

    Optional<Payment> findByProviderAndProviderRef(String provider, String providerRef);

    List<Payment> findByOrderIdOrderByCreatedAtDesc(Long orderId);

    List<Payment> findByUserIdOrderByCreatedAtDesc(Long userId);

    boolean existsByProviderAndProviderRef(String provider, String providerRef);
}
