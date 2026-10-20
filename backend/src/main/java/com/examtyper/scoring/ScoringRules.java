package com.examtyper.scoring;

import java.math.BigDecimal;
import java.util.Objects;

/**
 * The immutable rule set applied to one attempt.
 *
 * <p>This is a snapshot taken from the {@code ExamProfile} at attempt start, so
 * changing a profile later never rewrites history.
 *
 * @param durationSeconds       the fixed test duration
 * @param wordLengthChars       characters that count as one "word" (usually 5)
 * @param errorModel            how mistakes reduce net speed
 * @param errorPenaltyPerUnit   per-unit weight for {@link ErrorModel#PER_ERROR_PENALTY}
 * @param passingNetWpm         net WPM required to pass
 * @param minAccuracyPct        accuracy floor required to pass
 * @param backspaceAllowed      whether the candidate may correct mistakes
 */
public record ScoringRules(
        int durationSeconds,
        int wordLengthChars,
        ErrorModel errorModel,
        double errorPenaltyPerUnit,
        double passingNetWpm,
        double minAccuracyPct,
        boolean backspaceAllowed
) {

    public ScoringRules {
        if (durationSeconds <= 0) {
            throw new IllegalArgumentException("durationSeconds must be positive");
        }
        if (wordLengthChars <= 0) {
            throw new IllegalArgumentException("wordLengthChars must be positive");
        }
        Objects.requireNonNull(errorModel, "errorModel");
    }

    /** Rules for a plain word-based test with the classic full/half mistake model. */
    public static ScoringRules standard(int durationSeconds, double passingNetWpm) {
        return new ScoringRules(durationSeconds, 5, ErrorModel.FULL_AND_HALF_MISTAKES, 1.0, passingNetWpm, 0, true);
    }

    public ScoringRules withPassingNetWpm(double value) {
        return new ScoringRules(durationSeconds, wordLengthChars, errorModel, errorPenaltyPerUnit,
                value, minAccuracyPct, backspaceAllowed);
    }

    public ScoringRules withMinAccuracyPct(double value) {
        return new ScoringRules(durationSeconds, wordLengthChars, errorModel, errorPenaltyPerUnit,
                passingNetWpm, value, backspaceAllowed);
    }

    public ScoringRules withErrorModel(ErrorModel model) {
        return new ScoringRules(durationSeconds, wordLengthChars, model, errorPenaltyPerUnit,
                passingNetWpm, minAccuracyPct, backspaceAllowed);
    }

    public ScoringRules withBackspaceAllowed(boolean allowed) {
        return new ScoringRules(durationSeconds, wordLengthChars, errorModel, errorPenaltyPerUnit,
                passingNetWpm, minAccuracyPct, allowed);
    }

    public ScoringRules withWordLengthChars(int chars) {
        return new ScoringRules(durationSeconds, chars, errorModel, errorPenaltyPerUnit,
                passingNetWpm, minAccuracyPct, backspaceAllowed);
    }

    public ScoringRules withErrorPenaltyPerUnit(double penalty) {
        return new ScoringRules(durationSeconds, wordLengthChars, errorModel, penalty,
                passingNetWpm, minAccuracyPct, backspaceAllowed);
    }

    static BigDecimal scale(double value) {
        return BigDecimal.valueOf(value).setScale(2, java.math.RoundingMode.HALF_UP);
    }
}
