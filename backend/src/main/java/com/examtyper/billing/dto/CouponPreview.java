package com.examtyper.billing.dto;

/**
 * What a coupon would give on an order.
 *
 * @param code          the coupon's code
 * @param description   what the coupon says
 * @param discountPaise the discount, in paise
 * @param totalPaise    what the candidate would pay
 */
public record CouponPreview(
        String code,
        String description,
        int discountPaise,
        int totalPaise
) {
}
