package com.examtyper.attempt.dto;

import java.time.Instant;

/**
 * Where the candidate stands against the daily allowance.
 *
 * @param used      the tests taken today
 * @param limit     the allowance
 * @param remaining what is left
 * @param isPro     true when the candidate has no limit
 * @param resetsAt  when the allowance resets
 */
public record QuotaStatusResponse(
        int used,
        int limit,
        int remaining,
        boolean isPro,
        Instant resetsAt
) {
}
