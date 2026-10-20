package com.examtyper.billing.dto;

/**
 * What a gateway needs to create an order.
 *
 * @param orderId      the order's own identifier, used as the reference
 * @param orderNumber  the number shown to the candidate
 * @param planCode     the plan being bought
 * @param planName     the plan's name, for the provider's description
 * @param amountPaise  the amount to charge, in paise
 * @param currency     the currency
 * @param userId       the buyer's identifier
 * @param userEmail    the buyer's email, for the provider's records
 * @param couponCode   the coupon code, when one was given
 * @param discountPaise the discount the coupon gave, in paise
 */
public record CreateOrderRequest(
        Long orderId,
        String orderNumber,
        String planCode,
        String planName,
        int amountPaise,
        int discountPaise,
        String currency,
        Long userId,
        String userEmail,
        String couponCode
) {
    /** The amount the candidate actually pays, in paise. */
    public int totalPaise() {
        return Math.max(0, amountPaise - discountPaise);
    }
}
