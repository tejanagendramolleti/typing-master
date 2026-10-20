package com.examtyper.attempt.dto;

import java.time.Instant;
import java.util.List;
import java.util.Map;

/**
 * The full result of a submitted attempt.
 *
 * @param wordDiffs      per-word discrepancies for the coloured diff view
 * @param errorBreakdown how many of each error type occurred
 * @param cheatFlags     a list of anti-cheat signals detected during the attempt
 */
public record AttemptResultResponse(
        Long attemptId,
        String examCode,
        String examName,
        String language,
        String keyboardLayout,
        String status,
        double grossWpm,
        double netWpm,
        double accuracyPct,
        int fullMistakes,
        int halfMistakes,
        int totalMistakes,
        int keystrokes,
        int backspaces,
        int blurCount,
        long durationMs,
        int typedChars,
        int referenceWords,
        int typedWords,
        int correctWords,
        boolean passed,
        double passingNetWpm,
        Instant startedAt,
        Instant submittedAt,
        String typedText,
        String referenceText,
        List<WordDiffResponse> wordDiffs,
        Map<String, Integer> errorBreakdown,
        List<String> cheatFlags,
        Long certificateId
) {
    /**
     * One word-level discrepancy.
     */
    public record WordDiffResponse(
            String type,
            int index,
            String expected,
            String actual
    ) {
    }
}
