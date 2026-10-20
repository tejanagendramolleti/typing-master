package com.examtyper.scoring;

import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;

/**
 * The scoring engine.
 *
 * <p>This class is deliberately free of Spring, JPA and HTTP concerns beyond the
 * {@code @Component} annotation, so it can be unit tested in isolation and
 * reused anywhere.
 *
 * <p>Every result reported to a user is produced here from the raw submitted
 * text plus the recorded timing events. The client never gets to state its own
 * WPM.
 */
@Component
public class ScoringEngine {

    /**
     * Scores a finished attempt.
     *
     * @param referenceText the passage the candidate was asked to type
     * @param typedText     what the candidate actually typed (may be null)
     * @param rules         the exam rules snapshot for this attempt
     * @param elapsedMs     elapsed time in milliseconds
     * @param keystrokes    number of key presses recorded
     * @param backspaces    number of backspace presses recorded
     * @return the full score breakdown
     */
    public ScoreResult score(String referenceText,
                             String typedText,
                             ScoringRules rules,
                             long elapsedMs,
                             int keystrokes,
                             int backspaces) {

        String reference = TextNormalizer.nfc(referenceText == null ? "" : referenceText);
        String typed = TextNormalizer.nfc(typedText == null ? "" : typedText);

        List<String> referenceWords = TextNormalizer.words(reference);
        List<String> typedWords = TextNormalizer.words(typed);

        // ---- Word-level alignment -------------------------------------------
        List<WordDiff> diffs = new ArrayList<>();
        Map<ErrorType, Integer> breakdown = new EnumMap<>(ErrorType.class);
        int fullMistakes = 0;
        int halfMistakes = 0;
        int correctWords = 0;

        List<WordAligner.AlignedPair> pairs = WordAligner.align(referenceWords, typedWords);
        for (WordDiffRefiner.RefinedWord refined : WordDiffRefiner.refine(pairs, referenceWords, typedWords)) {
            if (refined.correct()) {
                correctWords++;
                continue;
            }
            WordDiff diff = refined.diff();
            diffs.add(diff);
            breakdown.merge(diff.type(), 1, Integer::sum);
            if (diff.type().isFull()) {
                fullMistakes++;
            } else {
                halfMistakes++;
            }
        }

        // ---- Speed ----------------------------------------------------------
        int typedChars = TextNormalizer.countTypedChars(typed);
        double minutes = Math.max(elapsedMs, 1L) / 60_000.0d;
        double grossWpm = (typedChars / (double) rules.wordLengthChars()) / minutes;

        // ---- Accuracy -------------------------------------------------------
        // Credit is weighted: an exact word is worth 1, a half mistake is worth
        // 0.5 (a case or punctuation slip is not the same as a wrong word) and a
        // full mistake is worth 0.
        //
        // The denominator is the longer of the two word lists, so typing extra
        // words is penalised just as a skipped word is. Otherwise adding a word
        // to the end of a perfect run would report 100% accuracy.
        double credit = correctWords + 0.5d * halfMistakes;
        int denominator = Math.max(referenceWords.size(), typedWords.size());
        double accuracyPct = denominator == 0 ? 0.0d : (100.0d * credit) / denominator;
        double accuracyRatio = denominator == 0 ? 0.0d : credit / denominator;

        double penalty = rules.errorModel().penalty(fullMistakes, halfMistakes, rules.errorPenaltyPerUnit());
        double netWpm = grossWpm - penalty;

        if (rules.errorModel() == ErrorModel.ACCURACY_ONLY) {
            // Scale the gross speed by how much of the passage was actually right.
            netWpm = grossWpm * accuracyRatio;
        }

        // Never report a negative speed.
        netWpm = Math.max(0.0d, netWpm);

        // ---- Pass / fail ----------------------------------------------------
        boolean passed = netWpm >= rules.passingNetWpm()
                && accuracyPct >= rules.minAccuracyPct()
                && !referenceWords.isEmpty();

        return new ScoreResult(
                round(grossWpm),
                round(netWpm),
                round(accuracyPct),
                fullMistakes,
                halfMistakes,
                Math.max(0, keystrokes),
                Math.max(0, backspaces),
                Math.max(0L, elapsedMs),
                typedChars,
                referenceWords.size(),
                typedWords.size(),
                correctWords,
                passed,
                diffs,
                breakdown);
    }

    private static double round(double value) {
        return Math.round(value * 100.0d) / 100.0d;
    }
}
