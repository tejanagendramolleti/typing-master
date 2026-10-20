package com.examtyper.billing.dto;

import jakarta.validation.constraints.Size;

/**
 * The administrator's note on a manual order.
 */
public record ApproveOrderRequest(
        @Size(max = 500, message = "The note is too long")
        String note
) {
}
