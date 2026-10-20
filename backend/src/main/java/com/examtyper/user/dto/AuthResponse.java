package com.examtyper.user.dto;

/**
 * The token pair returned by register, login and refresh.
 *
 * @param accessToken  short-lived JWT for API calls
 * @param refreshToken long-lived opaque token, exchanged for a new access token
 * @param expiresIn    access token lifetime in seconds
 * @param user         the signed-in user's profile
 */
public record AuthResponse(
        String tokenType,
        String accessToken,
        String refreshToken,
        long expiresIn,
        UserResponse user
) {
    public static AuthResponse of(String accessToken, String refreshToken, long expiresIn, UserResponse user) {
        return new AuthResponse("Bearer", accessToken, refreshToken, expiresIn, user);
    }
}
