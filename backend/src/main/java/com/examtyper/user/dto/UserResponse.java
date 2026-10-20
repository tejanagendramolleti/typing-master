package com.examtyper.user.dto;

import com.examtyper.user.User;
import com.examtyper.user.Role;

import java.time.Instant;

/**
 * The public view of a user account.
 */
public record UserResponse(
        Long id,
        String email,
        String displayName,
        Role role,
        boolean emailVerified,
        String preferredExamCode,
        String preferredLanguage,
        Integer targetWpm,
        boolean leaderboardOptOut,
        boolean showEmailOnLeaderboard,
        int dailyFreeLimit,
        String timezone,
        Instant createdAt,
        Instant lastLoginAt
) {
    public static UserResponse from(User user) {
        return new UserResponse(
                user.getId(),
                user.getEmail(),
                user.getDisplayName(),
                user.getRole(),
                user.isEmailVerified(),
                user.getPreferredExamCode(),
                user.getPreferredLanguage(),
                user.getTargetWpm(),
                user.isLeaderboardOptOut(),
                user.isShowEmailOnLeaderboard(),
                user.getDailyFreeLimit(),
                user.getTimezone(),
                user.getCreatedAt(),
                user.getLastLoginAt());
    }
}
