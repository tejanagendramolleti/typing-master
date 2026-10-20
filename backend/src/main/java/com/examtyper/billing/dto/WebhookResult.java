package com.examtyper.billing.dto;

import java.util.Map;

/**
 * What a provider's webhook said.
 *
 * @param provider    the provider's name
 * @param event       the event's name, in the provider's own words
 * @param providerRef the provider's reference for the payment
 * @param orderRef    the order the payment belongs to
 * @param status      the order's new status
 * @param amountPaise the amount that was paid, in paise
 * @param signature   the provider's signature, when it sent one
 * @param rawPayload  the body as it arrived, kept for the record
 */
public record WebhookResult(
        String provider,
        String event,
        String providerRef,
        String orderRef,
        String status,
        int amountPaise,
        String signature,
        Map<String, Object> rawPayload
) {
    /** True when the webhook says the payment succeeded. */
    public boolean isPaid() {
        return "PAID".equals(status);
    }
}
