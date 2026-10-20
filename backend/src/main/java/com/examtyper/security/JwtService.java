package com.examtyper.security;

import com.examtyper.common.config.AppProperties;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Date;
import java.util.Map;
import java.util.UUID;

/**
 * Issues and verifies JSON Web Tokens.
 *
 * <p>Access tokens are short-lived and carry the user's role. Refresh tokens are
 * long-lived, opaque (a random UUID rather than a JWT) and stored hashed in the
 * database so that they can be revoked individually.
 */
@Service
public class JwtService {

    private static final Logger log = LoggerFactory.getLogger(JwtService.class);

    private final SecretKey key;
    private final long accessTtlMinutes;
    private final long refreshTtlDays;

    public JwtService(AppProperties props) {
        this.key = buildKey(props.getJwt().getSecret());
        this.accessTtlMinutes = props.getJwt().getAccessTtlMinutes();
        this.refreshTtlDays = props.getJwt().getRefreshTtlDays();
    }

    private static SecretKey buildKey(String secret) {
        if (secret == null || secret.length() < 32) {
            throw new IllegalStateException(
                    "JWT secret must be at least 32 characters long. Set the JWT_SECRET environment variable.");
        }
        return Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }

    /**
     * Issues a signed access token for a user.
     */
    public String issueAccessToken(Long userId, String email, String role) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(String.valueOf(userId))
                .claim("email", email)
                .claim("role", role)
                .claim("typ", "access")
                .id(UUID.randomUUID().toString())
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(accessTtlMinutes, ChronoUnit.MINUTES)))
                .signWith(key)
                .compact();
    }

    /**
     * Generates a new opaque refresh token. Only the hash is stored.
     */
    public String generateRefreshToken() {
        return UUID.randomUUID().toString() + "." + UUID.randomUUID().toString();
    }

    /**
     * Hashes a refresh token for storage. SHA-256 is enough here because the
     * token is already high-entropy random, not a user-chosen password.
     */
    public String hashRefreshToken(String token) {
        try {
            java.security.MessageDigest digest = java.security.MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(token.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder(hash.length * 2);
            for (byte b : hash) {
                sb.append(Character.forDigit((b >> 4) & 0xF, 16)).append(Character.forDigit(b & 0xF, 16));
            }
            return sb.toString();
        } catch (java.security.NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 is not available", e);
        }
    }

    /**
     * Verifies an access token and returns its claims.
     *
     * @throws JwtException if the token is invalid, expired or malformed
     */
    public Claims parseAccessToken(String token) {
        return Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    /**
     * Parses without throwing, for code paths that treat a bad token as anonymous.
     */
    public Claims tryParseAccessToken(String token) {
        try {
            return parseAccessToken(token);
        } catch (JwtException | IllegalArgumentException e) {
            log.debug("Rejected access token: {}", e.getMessage());
            return null;
        }
    }

    public long getAccessTtlMinutes() {
        return accessTtlMinutes;
    }

    public long getRefreshTtlDays() {
        return refreshTtlDays;
    }

    public Map<String, Object> tokenMetadata() {
        return Map.of(
                "accessTtlMinutes", accessTtlMinutes,
                "refreshTtlDays", refreshTtlDays);
    }
}
