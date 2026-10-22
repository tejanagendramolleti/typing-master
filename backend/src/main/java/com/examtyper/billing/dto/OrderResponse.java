package com.examtyper.billing.dto;

import com.examtyper.billing.entity.Order;
import com.examtyper.billing.entity.Plan;

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
    /**
     * The view of an order.
     *
     * @param order the order
     * @param plan  the plan it was made for, when it is still known
     */
    public static OrderResponse from(Order order, Plan plan) {
        return new OrderResponse(
                order.getId(),
                order.getOrderNumber(),
                plan == null ? null : plan.getCode(),
                plan == null ? null : plan.getName(),
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
