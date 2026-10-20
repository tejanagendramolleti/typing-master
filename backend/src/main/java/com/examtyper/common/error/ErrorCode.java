package com.examtyper.common.error;

import org.springframework.http.HttpStatus;

/**
 * Canonical error codes. Keeping them in one place makes the API contract stable
 * and lets the frontend branch on {@code code} rather than on HTTP status alone.
 */
public enum ErrorCode {

    VALIDATION_FAILED(HttpStatus.BAD_REQUEST, "Request validation failed"),
    MALFORMED_REQUEST(HttpStatus.BAD_REQUEST, "Malformed request body"),
    UNAUTHENTICATED(HttpStatus.UNAUTHORIZED, "Authentication required"),
    INVALID_CREDENTIALS(HttpStatus.UNAUTHORIZED, "Invalid email or password"),
    INVALID_TOKEN(HttpStatus.UNAUTHORIZED, "Invalid or expired token"),
    ACCOUNT_DISABLED(HttpStatus.FORBIDDEN, "Account is disabled"),
    EMAIL_NOT_VERIFIED(HttpStatus.FORBIDDEN, "Email address is not verified"),
    ACCESS_DENIED(HttpStatus.FORBIDDEN, "You do not have access to this resource"),
    PAYWALL(HttpStatus.PAYMENT_REQUIRED, "A Pro subscription is required for this feature"),
    QUOTA_EXCEEDED(HttpStatus.TOO_MANY_REQUESTS, "Daily free limit reached"),
    RATE_LIMITED(HttpStatus.TOO_MANY_REQUESTS, "Too many requests, please slow down"),
    NOT_FOUND(HttpStatus.NOT_FOUND, "Resource not found"),
    CONFLICT(HttpStatus.CONFLICT, "Resource already exists"),
    ILLEGAL_STATE(HttpStatus.CONFLICT, "Operation is not allowed in the current state"),
    PAYMENT_FAILED(HttpStatus.BAD_REQUEST, "Payment could not be completed"),
    PAYMENT_DISABLED(HttpStatus.SERVICE_UNAVAILABLE, "Payments are currently disabled"),
    INTERNAL_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "Unexpected server error");

    private final HttpStatus status;
    private final String defaultMessage;

    ErrorCode(HttpStatus status, String defaultMessage) {
        this.status = status;
        this.defaultMessage = defaultMessage;
    }

    public HttpStatus status() {
        return status;
    }

    public String defaultMessage() {
        return defaultMessage;
    }
}
