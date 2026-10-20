package com.examtyper.user.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;

/**
 * Profile-preference update payload.
 */
public record UpdateProfileRequest(
        @Size(min = 2, max = 80, message = "Display name must be between 2 and 80 characters")
        String displayName,

        String preferredExamCode,

        @Size(max = 20)
        String preferredLanguage,

        @Min(5)
        @Max(200)
        Integer targetWpm,

        Boolean leaderboardOptOut,

        Boolean showEmailOnLeaderboard,

        @Size(max = 60)
        String timezone
) {
}
