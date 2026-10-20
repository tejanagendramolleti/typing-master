package com.examtyper.billing.repository;

import com.examtyper.billing.entity.CouponRedemption;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface CouponRedemptionRepository extends JpaRepository<CouponRedemption, Long> {

    long countByCouponId(Long couponId);

    long countByCouponIdAndUserId(Long couponId, Long userId);

    @Query("select count(r) from CouponRedemption r where r.couponId = :couponId and r.userId = :userId")
    long countForUser(@Param("couponId") Long couponId, @Param("userId") Long userId);
}
