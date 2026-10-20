package com.examtyper.user.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * Refresh-token exchange payload.
 */
public record RefreshRequest(
        @NotBlank(message = "Refresh token is required")
        String refreshToken
) {
}
