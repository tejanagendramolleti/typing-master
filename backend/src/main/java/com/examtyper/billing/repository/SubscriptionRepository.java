package com.examtyper.billing.repository;

import com.examtyper.billing.entity.Subscription;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface SubscriptionRepository extends JpaRepository<Subscription, Long> {

    List<Subscription> findByUserIdOrderByExpiresAtDesc(Long userId);

    /**
     * The user's active subscription, if there is one.
     *
     * <p>The date is checked as well as the status, so a subscription that
     * has run out stops counting even before the expiry job has marked it.
     */
    @Query("select s from Subscription s where s.userId = :userId and s.status = 'ACTIVE' "
            + "and s.expiresAt > :now order by s.expiresAt desc")
    Optional<Subscription> findActiveSubscription(@Param("userId") Long userId,
                                                 @Param("now") Instant now);

    Optional<Subscription> findByOrderId(Long orderId);

    /**
     * The subscriptions that have run out but are still marked active.
     */
    @Query("select s from Subscription s where s.status = 'ACTIVE' and s.expiresAt <= :now")
    List<Subscription> findExpiredActiveSubscriptions(@Param("now") Instant now);

    long countByStatusAndExpiresAtAfter(String status, Instant now);

    /**
     * The subscriptions that end within the given window, for the renewal
     * reminder.
     */
    @Query("select s from Subscription s where s.status = 'ACTIVE' and s.expiresAt > :now "
            + "and s.expiresAt <= :until order by s.expiresAt asc")
    List<Subscription> findExpiringBetween(@Param("now") Instant now, @Param("until") Instant until);
}
