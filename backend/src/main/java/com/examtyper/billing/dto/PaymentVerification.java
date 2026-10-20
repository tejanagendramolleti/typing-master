package com.examtyper.billing.dto;

import java.util.Map;

/**
 * What a provider said about a payment.
 *
 * @param provider     the provider's name
 * @param providerRef  the provider's reference for the payment
 * @param orderRef     the order the payment belongs to
 * @param status       {@code PAID}, {@code FAILED} or {@code PENDING}
 * @param amountPaise  the amount that was paid, in paise
 * @param currency     the currency
 * @param method       how it was paid, for the record
 * @param signature    the provider's signature, when it sent one
 * @param rawPayload   the payload as it arrived, kept for the record
 */
public record PaymentVerification(
        String provider,
        String providerRef,
        String orderRef,
        String status,
        int amountPaise,
        String currency,
        String method,
        String signature,
        Map<String, Object> rawPayload
) {
    /** True when the payment succeeded. */
    public boolean isPaid() {
        return "PAID".equals(status);
    }

    /** True when the payment failed. */
    public boolean isFailed() {
        return "FAILED".equals(status);
    }
}
