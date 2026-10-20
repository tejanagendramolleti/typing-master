package com.examtyper.billing.repository;

import com.examtyper.billing.entity.Order;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {

    Optional<Order> findByOrderNumber(String orderNumber);

    Optional<Order> findByIdempotencyKey(String idempotencyKey);

    List<Order> findByUserIdOrderByCreatedAtDesc(Long userId);

    Page<Order> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);

    Page<Order> findByStatusOrderByCreatedAtDesc(String status, Pageable pageable);

    List<Order> findByStatusIn(List<String> statuses);

    /**
     * The orders that have not been paid and are past their expiry.
     */
    @Query("select o from Order o where o.status in ('CREATED','PENDING','AWAITING_REVIEW') "
            + "and o.expiresAt is not null and o.expiresAt < :now")
    List<Order> findExpiredOpenOrders(@Param("now") java.time.Instant now);

    long countByStatus(String status);
}
