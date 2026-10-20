package com.examtyper.billing.dto;

import java.util.Map;

/**
 * What a provider returned when an order was created.
 *
 * @param provider    the provider's name
 * @param providerRef the provider's own reference, stored on the order
 * @param status      the order's new status
 * @param amountPaise the amount to charge, in paise
 * @param currency    the currency
 * @param checkoutUrl where the candidate should go to pay, when there is one
 * @param details     anything else the provider returned, kept for the record
 */
public record CreateOrderResult(
        String provider,
        String providerRef,
        String status,
        int amountPaise,
        String currency,
        String checkoutUrl,
        Map<String, String> details
) {
    /** True when the provider is ready for the candidate to pay. */
    public boolean isAwaitingPayment() {
        return "PENDING".equals(status) || "CREATED".equals(status)
                || "AWAITING_REVIEW".equals(status);
    }
}
