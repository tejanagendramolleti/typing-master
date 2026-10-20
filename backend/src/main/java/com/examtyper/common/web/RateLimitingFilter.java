package com.examtyper.common.web;

import com.examtyper.common.error.ApiError;
import com.examtyper.common.error.ErrorCode;
import com.examtyper.security.AuthenticatedUser;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * The rate limiter.
 *
 * <p>It applies to the endpoints where the cost of a request is high or
 * where a guess is worth making: the authentication endpoints and the test
 * submission endpoint.
 *
 * <p>The counting is per client, and the client is identified by the
 * authenticated user where there is one and by the address otherwise. A
 * token bucket is used rather than a fixed window, so a burst is allowed
 * but a sustained flood is not.
 *
 * <p>The buckets live in memory, which is right for a single instance. With
 * more than one instance the limit would be per instance rather than per
 * cluster, which is looser but not wrong. See {@code KNOWN_ISSUES.md}.
 */
@Component
public class RateLimitingFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(RateLimitingFilter.class);

    /** How long an idle bucket is forgotten. */
    private static final Duration BUCKET_LIFETIME = Duration.ofHours(2);

    private final Cache<String, TokenBucket> buckets = Caffeine.newBuilder()
            .expireAfterWrite(BUCKET_LIFETIME)
            .maximumSize(50_000)
            .build();

    private final ObjectMapper objectMapper;

    public RateLimitingFilter(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    /**
     * The limit for one path.
     *
     * @param requests how many requests are allowed
     * @param period   the window they are allowed in
     */
    private record Limit(int requests, Duration period) {
    }

    /** The limits, by the path prefix. */
    private static final Map<String, Limit> LIMITS = Map.of(
            "/api/v1/auth/login", new Limit(10, Duration.ofMinutes(5)),
            "/api/v1/auth/register", new Limit(5, Duration.ofMinutes(10)),
            "/api/v1/auth/forgot-password", new Limit(5, Duration.ofMinutes(10)),
            "/api/v1/auth/reset-password", new Limit(10, Duration.ofMinutes(10)),
            "/api/v1/auth/refresh", new Limit(60, Duration.ofMinutes(5)),
            "/api/v1/attempts/", new Limit(120, Duration.ofMinutes(5))
    );

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        Limit limit = limitFor(request);

        if (limit == null) {
            chain.doFilter(request, response);
            return;
        }

        String key = keyFor(request);
        TokenBucket bucket = buckets.get(key, k -> new TokenBucket(limit.requests(), limit.period()));

        if (!bucket.tryConsume()) {
            log.info("Rate limit hit for {} on {}", key, request.getRequestURI());
            writeTooManyRequests(response, limit);
            return;
        }

        chain.doFilter(request, response);
    }

    /**
     * The limit that applies to this request, or null when it is not
     * limited.
     */
    private Limit limitFor(HttpServletRequest request) {
        String path = request.getRequestURI();

        // Only the paths that cost something are limited. A GET on the
        // catalogue is not.
        for (Map.Entry<String, Limit> entry : LIMITS.entrySet()) {
            String prefix = entry.getKey();
            if (!path.startsWith(prefix)) {
                continue;
            }
            // The attempt limit covers the submission endpoint, not the
            // whole attempts tree, because starting a test is cheap and
            // submitting one is not.
            if (prefix.equals("/api/v1/attempts/") && !path.endsWith("/submit")) {
                continue;
            }
            return entry.getValue();
        }
        return null;
    }

    /**
     * The key the bucket is counted under.
     *
     * <p>The authenticated user is used when there is one, so two people
     * behind the same address do not use up each other's allowance. The
     * address is used otherwise.
     */
    private String keyFor(HttpServletRequest request) {
        String path = request.getRequestURI();

        for (Map.Entry<String, Limit> entry : LIMITS.entrySet()) {
            if (path.startsWith(entry.getKey())) {
                return entry.getKey() + "|" + clientKey(request);
            }
        }
        return path;
    }

    private String clientKey(HttpServletRequest request) {
        // The authenticated user is used when there is one, so two people
        // behind the same address do not use up each other's allowance.
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.isAuthenticated()
                && authentication.getPrincipal() instanceof AuthenticatedUser user) {
            return "u:" + user.getId();
        }
        return "ip:" + clientAddress(request);
    }

    /**
     * The client's address.
     *
     * <p>The forwarding header is only trusted when the application is
     * behind a proxy that sets it, because a client can send anything.
     */
    private String clientAddress(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank() && trustForwardedFor()) {
            int comma = forwarded.indexOf(',');
            return (comma > 0 ? forwarded.substring(0, comma) : forwarded).trim();
        }
        return request.getRemoteAddr() == null ? "unknown" : request.getRemoteAddr();
    }

    /**
     * True when the forwarding header should be believed.
     *
     * <p>It is believed only outside production, because in production the
     * address has to come from the proxy and the proxy overwrites the
     * header. A client that could set it could dodge the limit.
     */
    private boolean trustForwardedFor() {
        String env = System.getProperty("app.env",
                System.getenv().getOrDefault("APP_ENV", "dev"));
        return !"prod".equalsIgnoreCase(env);
    }

    /**
     * Writes the 429 response, in the same error envelope as every other
     * error.
     */
    private void writeTooManyRequests(HttpServletResponse response, Limit limit) throws IOException {
        ApiError error = ApiError.of(
                ErrorCode.RATE_LIMITED.name(),
                ErrorCode.RATE_LIMITED.defaultMessage(),
                response.getHeader("X-Request-Id"),
                null);

        response.setStatus(ErrorCode.RATE_LIMITED.status().value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setHeader(HttpHeaders.RETRY_AFTER, String.valueOf(limit.period().toSeconds()));
        response.getWriter().write(objectMapper.writeValueAsString(error));
    }

    /**
     * A token bucket: it refills over time rather than resetting on a
     * boundary.
     */
    private static final class TokenBucket {

        private final int capacity;
        private final double refillPerNanosecond;
        private double tokens;
        private long lastRefill;

        TokenBucket(int capacity, Duration period) {
            this.capacity = capacity;
            this.refillPerNanosecond = (double) capacity / period.toNanos();
            this.tokens = capacity;
            this.lastRefill = System.nanoTime();
        }

        /**
         * Takes a token, if there is one.
         */
        synchronized boolean tryConsume() {
            long now = System.nanoTime();
            long elapsed = now - lastRefill;
            if (elapsed > 0) {
                tokens = Math.min(capacity, tokens + elapsed * refillPerNanosecond);
                lastRefill = now;
            }
            if (tokens >= 1.0) {
                tokens -= 1.0;
                return true;
            }
            return false;
        }
    }
}
