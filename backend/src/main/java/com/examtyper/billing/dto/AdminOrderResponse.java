package com.examtyper.billing.dto;

import com.examtyper.billing.entity.Order;

import java.time.Instant;

/**
 * The administrator's view of an order.
 *
 * <p>It shows the candidate's email, because the administrator is
 * matching the order against a bank statement and needs to know whose
 * payment it is.
 */
public record AdminOrderResponse(
        Long id,
        String orderNumber,
        Long userId,
        String userEmail,
        String planName,
        String provider,
        String status,
        int amountPaise,
        int discountPaise,
        int totalPaise,
        String currency,
        String manualRef,
        String manualNote,
        String adminNote,
        Instant createdAt,
        Instant reviewedAt
) {
    public static AdminOrderResponse from(Order order) {
        return new AdminOrderResponse(
                order.getId(),
                order.getOrderNumber(),
                order.getUserId(),
                null,
                null,
                order.getProvider(),
                order.getStatus(),
                order.getAmountPaise(),
                order.getDiscountPaise(),
                order.getTotalPaise(),
                order.getCurrency(),
                order.getManualRef(),
                order.getManualNote(),
                order.getAdminNote(),
                order.getCreatedAt(),
                order.getReviewedAt());
    }
}
