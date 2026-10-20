package com.examtyper.billing.dto;

import com.examtyper.billing.entity.Order;

import java.time.Instant;

/**
 * The public view of an order.
 */
public record OrderResponse(
        Long id,
        String orderNumber,
        String planCode,
        String planName,
        String provider,
        String status,
        int amountPaise,
        int discountPaise,
        int totalPaise,
        String currency,
        String manualRef,
        String adminNote,
        Instant createdAt,
        Instant expiresAt
) {
    public static OrderResponse from(Order order) {
        return new OrderResponse(
                order.getId(),
                order.getOrderNumber(),
                null,
                null,
                order.getProvider(),
                order.getStatus(),
                order.getAmountPaise(),
                order.getDiscountPaise(),
                order.getTotalPaise(),
                order.getCurrency(),
                order.getManualRef(),
                order.getAdminNote(),
                order.getCreatedAt(),
                order.getExpiresAt());
    }
}
