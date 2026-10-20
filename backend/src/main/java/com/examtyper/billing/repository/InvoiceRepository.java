package com.examtyper.billing.repository;

import com.examtyper.billing.entity.Invoice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface InvoiceRepository extends JpaRepository<Invoice, Long> {

    Optional<Invoice> findByNumber(String number);

    List<Invoice> findByUserIdOrderByIssuedAtDesc(Long userId);

    Optional<Invoice> findByOrderId(Long orderId);
}
