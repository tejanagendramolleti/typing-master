package com.examtyper.attempt.dto;

import java.time.Instant;

/**
 * A recent result, as the dashboard shows it.
 */
public record RecentResultResponse(
        Long attemptId,
        String examCode,
        String examName,
        double netWpm,
        double accuracyPct,
        boolean passed,
        Instant submittedAt
) {
}
