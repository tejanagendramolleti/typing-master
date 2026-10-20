package com.examtyper.attempt.dto;

import java.time.Instant;

/**
 * The state of an in-progress attempt, used to resume after a page refresh.
 *
 * @param attemptId     the attempt's id
 * @param examCode     the exam profile code
 * @param referenceText the passage to type
 * @param durationSeconds the time limit
 * @param startedAt    when the attempt began
 * @param serverTime   the server's current time, so the client can correct its clock
 * @param elapsedMs    how long the attempt has been running
 * @param backspaceAllowed whether corrections are permitted
 * @param showLiveWpm  whether the client should show a live speed
 * @param typedText    any text already typed, for resume
 * @param keystrokeCount how many keys have been pressed so far
 */
public record AttemptResponse(
        Long attemptId,
        String examCode,
        String examName,
        String language,
        String keyboardLayout,
        String referenceText,
        int durationSeconds,
        int wordLengthChars,
        Instant startedAt,
        Instant serverTime,
        long elapsedMs,
        long remainingMs,
        boolean backspaceAllowed,
        boolean showLiveWpm,
        double passingNetWpm,
        String typedText,
        int keystrokeCount,
        int backspaceCount
) {
}
