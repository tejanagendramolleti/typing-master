package com.examtyper.billing.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * The UPI transaction reference the candidate gives for a manual order.
 */
public record ManualReferenceRequest(
        @NotBlank(message = "The transaction reference is required")
        @Size(max = 120, message = "The transaction reference is too long")
        String manualRef,

        @Size(max = 500)
        String note
) {
}
