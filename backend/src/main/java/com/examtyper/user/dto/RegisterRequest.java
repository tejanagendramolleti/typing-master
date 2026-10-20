package com.examtyper.user.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Registration payload.
 */
public record RegisterRequest(
        @NotBlank(message = "Email is required")
        @Email(message = "Enter a valid email address")
        @Size(max = 190, message = "Email is too long")
        String email,

        @NotBlank(message = "Password is required")
        @Size(min = 8, max = 72, message = "Password must be between 8 and 72 characters")
        String password,

        @NotBlank(message = "Display name is required")
        @Size(min = 2, max = 80, message = "Display name must be between 2 and 80 characters")
        String displayName,

        String preferredExamCode,

        @Size(max = 20)
        String preferredLanguage,

        @jakarta.validation.constraints.Min(5)
        @jakarta.validation.constraints.Max(200)
        Integer targetWpm
) {
}
