package com.examtyper.scoring;

import java.util.List;

/**
 * The complete result of scoring one attempt.
 *
 * @param grossWpm       raw speed: (typed characters / word length) / minutes
 * @param netWpm         speed after applying the exam's mistake penalty
 * @param accuracyPct    weighted percentage of the passage typed correctly
 * @param fullMistakes   count of wrong / missing / extra words
 * @param halfMistakes   count of case / punctuation / spacing slips
 * @param keystrokes     number of key presses recorded for the attempt
 * @param backspaces     number of backspace presses recorded
 * @param timeTakenMs    elapsed time used for the calculation
 * @param typedChars     non-whitespace characters the candidate produced
 * @param referenceWords total words in the reference passage
 * @param typedWords     total words the candidate produced
 * @param correctWords   words typed exactly right
 * @param passed         whether the attempt met the profile's pass criteria
 * @param wordDiffs      per-word discrepancy list
 * @param errorBreakdown count per {@link ErrorType}
 */
public record ScoreResult(
        double grossWpm,
        double netWpm,
        double accuracyPct,
        int fullMistakes,
        int halfMistakes,
        int keystrokes,
        int backspaces,
        long timeTakenMs,
        int typedChars,
        int referenceWords,
        int typedWords,
        int correctWords,
        boolean passed,
        List<WordDiff> wordDiffs,
        java.util.Map<ErrorType, Integer> errorBreakdown
) {

    public ScoreResult {
        wordDiffs = wordDiffs == null ? List.of() : List.copyOf(wordDiffs);
        errorBreakdown = errorBreakdown == null ? java.util.Map.of() : java.util.Map.copyOf(errorBreakdown);
    }

    /** Total number of mistakes, full and half combined. */
    public int totalMistakes() {
        return fullMistakes + halfMistakes;
    }
}
