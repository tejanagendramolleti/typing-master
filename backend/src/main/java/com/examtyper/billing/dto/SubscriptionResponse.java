package com.examtyper.billing.dto;

import com.examtyper.billing.entity.Subscription;

import java.time.Instant;

/**
 * The public view of a subscription.
 */
public record SubscriptionResponse(
        Long id,
        String provider,
        String status,
        Instant startsAt,
        Instant expiresAt,
        boolean autoRenew
) {
    public static SubscriptionResponse from(Subscription subscription) {
        return new SubscriptionResponse(
                subscription.getId(),
                subscription.getProvider(),
                subscription.getStatus(),
                subscription.getStartsAt(),
                subscription.getExpiresAt(),
                subscription.isAutoRenew());
    }
}
