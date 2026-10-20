package com.examtyper.attempt.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * Request to start a typing attempt.
 */
public record StartAttemptRequest(
        @NotBlank(message = "Exam code is required")
        String examCode,

        /** Optional passage id; when absent the server picks one. */
        Long passageId,

        /** Optional mock test id for a full-length mock. */
        Long mockTestId,

        /** Optional difficulty filter used when the server picks a passage. */
        String difficulty
) {
}
