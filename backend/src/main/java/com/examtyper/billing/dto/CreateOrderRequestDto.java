package com.examtyper.billing.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * The payload for starting an order.
 */
public record CreateOrderRequestDto(
        @NotBlank(message = "The plan code is required")
        @Size(max = 40)
        String planCode,

        @Size(max = 40)
        String couponCode,

        /**
         * An optional key that makes the request idempotent. The same key
         * twice gives the same order, which matters when a candidate clicks
         * the button twice on a slow connection.
         */
        @Size(max = 80)
        String idempotencyKey,

        /**
         * The payment method the candidate chose — {@code MOCK} for the
         * development gateway or {@code MANUAL} for the UPI method. When
         * it is left out, the deployment's default method is used.
         */
        @Size(max = 30)
        String paymentMethod
) {
}
