package com.examtyper.common.error;

/**
 * Thrown when a free-tier user reaches a Pro-gated feature.
 * Carries the code the frontend uses to render the upgrade prompt.
 */
public class PaywallException extends BusinessException {
    public PaywallException(String message) {
        super(ErrorCode.PAYWALL, message);
    }

    public PaywallException() {
        super(ErrorCode.PAYWALL);
    }
}
