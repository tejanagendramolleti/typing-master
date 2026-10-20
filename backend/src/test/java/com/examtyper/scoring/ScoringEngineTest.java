package com.examtyper.scoring;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.MethodSource;

import java.text.Normalizer;
import java.util.List;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;

/**
 * Table-driven tests for the scoring engine.
 *
 * <p>These cover the cases the product brief calls out explicitly: perfect runs,
 * empty submissions, extra and skipped words, case-only errors, punctuation,
 * trailing whitespace, Hindi conjuncts, Unicode normalisation, very short and
 * very long text, and each of the three error models.
 */
class ScoringEngineTest {

    private final ScoringEngine engine = new ScoringEngine();

    private static final ScoringRules STANDARD =
            new ScoringRules(300, 5, ErrorModel.FULL_AND_HALF_MISTAKES, 1.0, 30.0, 0.0, true);

    // ---------------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------------

    private ScoreResult score(String reference, String typed) {
        return engine.score(reference, typed, STANDARD, 60_000L, 0, 0);
    }

    private ScoreResult score(String reference, String typed, ScoringRules rules) {
        return engine.score(reference, typed, rules, 60_000L, 0, 0);
    }

    // ---------------------------------------------------------------------
    // Core correctness
    // ---------------------------------------------------------------------

    @Nested
    @DisplayName("perfect runs")
    class PerfectRuns {

        @Test
        @DisplayName("an exact match scores 100% accuracy with no mistakes")
        void exactMatch() {
            ScoreResult r = score("the quick brown fox", "the quick brown fox");

            assertThat(r.fullMistakes()).isZero();
            assertThat(r.halfMistakes()).isZero();
            assertThat(r.accuracyPct()).isEqualTo(100.0);
            assertThat(r.correctWords()).isEqualTo(4);
            assertThat(r.referenceWords()).isEqualTo(4);
            assertThat(r.wordDiffs()).isEmpty();
        }

        @Test
        @DisplayName("gross WPM counts five characters as one word")
        void grossWpmUsesWordLength() {
            // 25 characters / 5 chars-per-word = 5 words in 1 minute = 5 WPM.
            ScoreResult r = score("abcde fghij klmno pqrst uvwxy", "abcde fghij klmno pqrst uvwxy");

            assertThat(r.typedChars()).isEqualTo(25);
            assertThat(r.grossWpm()).isEqualTo(5.0);
            assertThat(r.netWpm()).isEqualTo(5.0);
        }

        @Test
        @DisplayName("gross WPM scales with elapsed time")
        void grossWpmScalesWithTime() {
            ScoreResult r = engine.score("abcde fghij", "abcde fghij", STANDARD, 120_000L, 0, 0);

            // 10 chars / 5 = 2 words over 2 minutes = 1 WPM.
            assertThat(r.grossWpm()).isEqualTo(1.0);
        }

        @Test
        @DisplayName("whitespace does not count towards typed characters")
        void whitespaceExcludedFromCharCount() {
            ScoreResult r = score("a b c", "a  b   c");

            assertThat(r.typedChars()).isEqualTo(3);
            assertThat(r.grossWpm()).isCloseTo(0.6, within(0.001));
        }
    }

    // ---------------------------------------------------------------------
    // Empty and edge-case submissions
    // ---------------------------------------------------------------------

    @Nested
    @DisplayName("empty and degenerate submissions")
    class EmptySubmissions {

        @Test
        @DisplayName("an empty submission scores zero and counts every word as missing")
        void emptySubmission() {
            ScoreResult r = score("the quick brown fox", "");

            assertThat(r.typedChars()).isZero();
            assertThat(r.grossWpm()).isEqualTo(0.0);
            assertThat(r.netWpm()).isEqualTo(0.0);
            assertThat(r.accuracyPct()).isEqualTo(0.0);
            assertThat(r.fullMistakes()).isEqualTo(4);
            assertThat(r.correctWords()).isZero();
            assertThat(r.passed()).isFalse();
        }

        @Test
        @DisplayName("a null submission is treated as empty rather than throwing")
        void nullSubmission() {
            ScoreResult r = engine.score("the quick brown fox", null, STANDARD, 60_000L, 0, 0);

            assertThat(r.typedChars()).isZero();
            assertThat(r.fullMistakes()).isEqualTo(4);
        }

        @Test
        @DisplayName("an empty reference produces a zero score without dividing by zero")
        void emptyReference() {
            ScoreResult r = score("", "");

            assertThat(r.grossWpm()).isEqualTo(0.0);
            assertThat(r.accuracyPct()).isEqualTo(0.0);
            assertThat(r.passed()).isFalse();
            assertThat(r.referenceWords()).isZero();
        }

        @Test
        @DisplayName("a whitespace-only submission is empty")
        void whitespaceOnlySubmission() {
            ScoreResult r = score("one two", "   \n\t  ");

            assertThat(r.typedChars()).isZero();
            assertThat(r.fullMistakes()).isEqualTo(2);
        }

        @Test
        @DisplayName("a very short single-word passage scores correctly")
        void veryShortText() {
            ScoreResult r = score("cat", "cat");

            assertThat(r.grossWpm()).isCloseTo(0.6, within(0.001));
            assertThat(r.accuracyPct()).isEqualTo(100.0);
            assertThat(r.referenceWords()).isEqualTo(1);
        }

        @Test
        @DisplayName("a very long passage is handled without truncation")
        void veryLongText() {
            String word = "consistency ";
            String reference = word.repeat(2000).trim();
            ScoreResult r = score(reference, reference);

            assertThat(r.referenceWords()).isEqualTo(2000);
            assertThat(r.correctWords()).isEqualTo(2000);
            assertThat(r.accuracyPct()).isEqualTo(100.0);
            assertThat(r.fullMistakes()).isZero();
        }
    }

    // ---------------------------------------------------------------------
    // Word-level errors
    // ---------------------------------------------------------------------

    @Nested
    @DisplayName("word-level errors")
    class WordErrors {

        @Test
        @DisplayName("a single wrong word is one full mistake")
        void singleWrongWord() {
            ScoreResult r = score("the quick brown fox", "the quik brown fox");

            assertThat(r.fullMistakes()).isEqualTo(1);
            assertThat(r.halfMistakes()).isZero();
            assertThat(r.accuracyPct()).isEqualTo(75.0);
            assertThat(r.wordDiffs()).hasSize(1);
            assertThat(r.wordDiffs().get(0).type()).isEqualTo(ErrorType.WRONG);
            assertThat(r.wordDiffs().get(0).expected()).isEqualTo("quick");
            assertThat(r.wordDiffs().get(0).actual()).isEqualTo("quik");
        }

        @Test
        @DisplayName("a skipped word does not mark the rest of the passage wrong")
        void skippedWordShiftsAlignment() {
            ScoreResult r = score("the quick brown fox jumps", "the brown fox jumps");

            assertThat(r.fullMistakes()).isEqualTo(1);
            assertThat(r.halfMistakes()).isZero();
            assertThat(r.correctWords()).isEqualTo(4);
            assertThat(r.accuracyPct()).isEqualTo(80.0);
            assertThat(r.wordDiffs()).hasSize(1);
            assertThat(r.wordDiffs().get(0).type()).isEqualTo(ErrorType.MISSING);
            assertThat(r.wordDiffs().get(0).expected()).isEqualTo("quick");
            assertThat(r.wordDiffs().get(0).actual()).isNull();
        }

        @Test
        @DisplayName("an extra trailing word is one full mistake")
        void extraWord() {
            ScoreResult r = score("a b c", "a b c d");

            assertThat(r.fullMistakes()).isEqualTo(1);
            assertThat(r.correctWords()).isEqualTo(3);
            // 3 correct of 4 words (the longer list) = 75%.
            assertThat(r.accuracyPct()).isEqualTo(75.0);
            assertThat(r.wordDiffs()).hasSize(1);
            assertThat(r.wordDiffs().get(0).type()).isEqualTo(ErrorType.EXTRA);
            assertThat(r.wordDiffs().get(0).expected()).isNull();
            assertThat(r.wordDiffs().get(0).actual()).isEqualTo("d");
        }

        @Test
        @DisplayName("an extra word in the middle does not displace the surrounding words")
        void extraWordInTheMiddle() {
            ScoreResult r = score("the quick brown fox", "the very quick brown fox");

            // The alignment inserts "very" and keeps every other word matched,
            // so one extra word is one full mistake and nothing cascades.
            assertThat(r.fullMistakes()).isEqualTo(1);
            assertThat(r.correctWords()).isEqualTo(4);
            assertThat(r.wordDiffs()).hasSize(1);
            assertThat(r.wordDiffs().get(0).type()).isEqualTo(ErrorType.EXTRA);
            assertThat(r.wordDiffs().get(0).expected()).isNull();
            assertThat(r.wordDiffs().get(0).actual()).isEqualTo("very");
        }

        @Test
        @DisplayName("a case-only difference is a half mistake")
        void caseOnlyError() {
            ScoreResult r = score("The Quick Brown Fox", "the quick brown fox");

            assertThat(r.fullMistakes()).isZero();
            assertThat(r.halfMistakes()).isEqualTo(4);
            // Every word earns half credit: (0 + 0.5 * 4) / 4 = 50%.
            assertThat(r.accuracyPct()).isEqualTo(50.0);
            assertThat(r.wordDiffs()).allMatch(d -> d.type() == ErrorType.CASE);
        }

        @Test
        @DisplayName("a punctuation-only difference is a half mistake")
        void punctuationOnlyError() {
            ScoreResult r = score("the quick, brown fox", "the quick brown fox");

            assertThat(r.fullMistakes()).isZero();
            assertThat(r.halfMistakes()).isEqualTo(1);
            assertThat(r.wordDiffs().get(0).type()).isEqualTo(ErrorType.PUNCTUATION);
        }

        @Test
        @DisplayName("a trailing full stop difference is a half mistake")
        void trailingPunctuationError() {
            ScoreResult r = score("the quick brown fox.", "the quick brown fox");

            assertThat(r.halfMistakes()).isEqualTo(1);
            assertThat(r.wordDiffs().get(0).type()).isEqualTo(ErrorType.PUNCTUATION);
        }

        @Test
        @DisplayName("a spacing-only difference inside a word is a half mistake")
        void spacingOnlyError() {
            ScoreResult r = score("the quick brown fox", "the quickbrown fox");

            assertThat(r.fullMistakes()).isZero();
            assertThat(r.halfMistakes()).isEqualTo(1);
            assertThat(r.wordDiffs().get(0).type()).isEqualTo(ErrorType.SPACING);
        }

        @Test
        @DisplayName("an extra internal space produces a spacing half mistake")
        void extraInternalSpace() {
            // The word list splits on whitespace, so "qu ick" becomes two words.
            // The aligned pair differs only by spacing, so it is a half mistake.
            ScoreResult r = score("the quick brown fox", "the qu ick brown fox");

            assertThat(r.halfMistakes()).isEqualTo(1);
            assertThat(r.fullMistakes()).isZero();
            assertThat(r.wordDiffs().get(0).type()).isEqualTo(ErrorType.SPACING);
        }

        @Test
        @DisplayName("trailing whitespace in the typed text does not create a mistake")
        void trailingWhitespace() {
            ScoreResult r = score("the quick brown fox", "the quick brown fox   \n  ");

            assertThat(r.fullMistakes()).isZero();
            assertThat(r.halfMistakes()).isZero();
            assertThat(r.accuracyPct()).isEqualTo(100.0);
        }

        @Test
        @DisplayName("leading whitespace in the typed text does not create a mistake")
        void leadingWhitespace() {
            ScoreResult r = score("the quick brown fox", "   the quick brown fox");

            assertThat(r.fullMistakes()).isZero();
            assertThat(r.accuracyPct()).isEqualTo(100.0);
        }

        @Test
        @DisplayName("several scattered errors are all counted")
        void multipleScatteredErrors() {
            ScoreResult r = score("one two three four five", "one TWO three four fivee");

            assertThat(r.fullMistakes()).isEqualTo(1);   // fivee
            assertThat(r.halfMistakes()).isEqualTo(1);   // TWO
            assertThat(r.correctWords()).isEqualTo(3);
            // (3 correct + 0.5 for the case slip) / 5 words = 70%.
            assertThat(r.accuracyPct()).isEqualTo(70.0);
        }

        @ParameterizedTest(name = "[{index}] \"{0}\" vs \"{1}\" -> {2}")
        @CsvSource({
                "'the cat',        'the bat',      WRONG",
                "'a b c',          'a b c d',      EXTRA",
                "'the cat sat',    'the cat',      MISSING",
                "'THE',            'the',          CASE",
                "'the cat.',       'the cat',      PUNCTUATION",
        })
        @DisplayName("error classification table")
        void classificationTable(String reference, String typed, ErrorType expected) {
            ScoreResult r = score(reference, typed);

            assertThat(r.wordDiffs()).hasSize(1);
            assertThat(r.wordDiffs().get(0).type()).isEqualTo(expected);
        }
    }

    // ---------------------------------------------------------------------
    // Unicode
    // ---------------------------------------------------------------------

    @Nested
    @DisplayName("unicode handling")
    class UnicodeHandling {

        @Test
        @DisplayName("Hindi conjuncts compare equal in NFC form")
        void hindiConjuncts() {
            // क्ष, क् + ष
            ScoreResult r = score("क्षत्रिय शिक्षा", "क्षत्रिय शिक्षा");

            assertThat(r.accuracyPct()).isEqualTo(100.0);
            assertThat(r.fullMistakes()).isZero();
        }

        @Test
        @DisplayName("a decomposed Hindi word is treated as equal to its composed form")
        void hindiNfdEqualsNfc() {
            // U+0929 DEVANAGARI LETTER NNA has a canonical decomposition to
            // U+0928 + U+093C, so its NFD and NFC forms genuinely differ.
            String composed = new String(Character.toChars(0x0929));
            String decomposed = Normalizer.normalize(composed, Normalizer.Form.NFD);

            assertThat(decomposed).isNotEqualTo(composed);
            assertThat(composed.codePointAt(0)).isEqualTo(0x0929);

            ScoreResult r = score(composed, decomposed);

            assertThat(r.accuracyPct()).isEqualTo(100.0);
            assertThat(r.fullMistakes()).isZero();
            assertThat(r.halfMistakes()).isZero();
        }

        @Test
        @DisplayName("a decomposed Devanagari q-nukta is treated as equal to its composed form")
        void hindiNuktaNfdEqualsNfc() {
            // U+0958 DEVANAGARI LETTER QA decomposes to U+0915 + U+093C.
            String composed = new String(Character.toChars(0x0958));
            String decomposed = Normalizer.normalize(composed, Normalizer.Form.NFD);

            assertThat(decomposed).isNotEqualTo(composed);
            assertThat(composed.codePointAt(0)).isEqualTo(0x0958);

            ScoreResult r = score(composed, decomposed);

            assertThat(r.accuracyPct()).isEqualTo(100.0);
            assertThat(r.fullMistakes()).isZero();
        }

        @Test
        @DisplayName("a different Hindi word is a full mistake")
        void hindiWrongWord() {
            // विद्यालय (vidyalaya) vs विद्यालयी (vidyalayii) differ by a trailing
            // matra, which is a combining mark — it must not be ignored.
            String school = new String(new int[]{
                    0x0935, 0x093F, 0x0926, 0x094D, 0x092F, 0x093E, 0x0932, 0x092F}, 0, 8);
            String schoolWithSuffix = new String(new int[]{
                    0x0935, 0x093F, 0x0926, 0x094D, 0x092F, 0x093E, 0x0932, 0x092F, 0x0940}, 0, 9);

            ScoreResult r = score(school, schoolWithSuffix);

            assertThat(r.fullMistakes()).isEqualTo(1);
            assertThat(r.accuracyPct()).isEqualTo(0.0);
        }

        @Test
        @DisplayName("Telugu text compares correctly")
        void teluguText() {
            ScoreResult r = score("తెలుగు లిపి", "తెలుగు లిపి");

            assertThat(r.accuracyPct()).isEqualTo(100.0);
            assertThat(r.correctWords()).isEqualTo(2);
        }

        @Test
        @DisplayName("Telugu text in NFD form is treated as equal to NFC form")
        void teluguNfdEqualsNfc() {
            // U+0C48 TELUGU VOWEL SIGN EE decomposes canonically.
            String composed = new String(Character.toChars(0x0C48));
            String decomposed = Normalizer.normalize(composed, Normalizer.Form.NFD);

            assertThat(decomposed).isNotEqualTo(composed);
            assertThat(composed.codePointAt(0)).isEqualTo(0x0C48);

            ScoreResult r = score(composed, decomposed);

            assertThat(r.accuracyPct()).isEqualTo(100.0);
            assertThat(r.fullMistakes()).isZero();
        }

        @Test
        @DisplayName("emoji and symbols in the reference are not silently dropped")
        void symbolsAreCounted() {
            ScoreResult r = score("alpha ₹ 100 beta", "alpha ₹ 100 beta");

            // "alpha" (5) + "₹" (1) + "100" (3) + "beta" (4) = 13 non-space characters.
            assertThat(r.typedChars()).isEqualTo(13);
            assertThat(r.accuracyPct()).isEqualTo(100.0);
        }
    }

    // ---------------------------------------------------------------------
    // Error models
    // ---------------------------------------------------------------------

    @Nested
    @DisplayName("error models")
    class ErrorModels {

        @Test
        @DisplayName("FULL_AND_HALF_MISTAKES subtracts a full word per full mistake")
        void fullAndHalfModel() {
            // 25 chars = 5 gross WPM over one minute. One full mistake -> 4 WPM.
            ScoreResult r = score("abcde fghij klmno pqrst uvwxy", "abcde fghij klmno pqrst uvwxz",
                    STANDARD.withErrorModel(ErrorModel.FULL_AND_HALF_MISTAKES));

            assertThat(r.grossWpm()).isEqualTo(5.0);
            assertThat(r.fullMistakes()).isEqualTo(1);
            assertThat(r.netWpm()).isEqualTo(4.0);
        }

        @Test
        @DisplayName("FULL_AND_HALF_MISTAKES subtracts half a word per half mistake")
        void fullAndHalfModelHalfMistake() {
            ScoreResult r = score("abcde fghij klmno pqrst uvwxy", "ABCDE fghij klmno pqrst uvwxy",
                    STANDARD.withErrorModel(ErrorModel.FULL_AND_HALF_MISTAKES));

            assertThat(r.grossWpm()).isEqualTo(5.0);
            assertThat(r.halfMistakes()).isEqualTo(1);
            assertThat(r.netWpm()).isEqualTo(4.5);
        }

        @Test
        @DisplayName("PER_ERROR_PENALTY charges every mistake the configured weight")
        void perErrorPenaltyModel() {
            ScoreResult r = score("abcde fghij klmno pqrst uvwxy", "abcde fghij klmno pqrst uvwxz",
                    STANDARD.withErrorModel(ErrorModel.PER_ERROR_PENALTY).withErrorPenaltyPerUnit(2.0));

            assertThat(r.grossWpm()).isEqualTo(5.0);
            // 1 mistake * 2.0 words of penalty
            assertThat(r.netWpm()).isEqualTo(3.0);
        }

        @Test
        @DisplayName("PER_ERROR_PENALTY with a zero weight leaves gross speed untouched")
        void perErrorPenaltyZero() {
            ScoreResult r = score("abcde fghij klmno pqrst uvwxy", "abcde fghij klmno pqrst uvwxz",
                    STANDARD.withErrorModel(ErrorModel.PER_ERROR_PENALTY).withErrorPenaltyPerUnit(0.0));

            assertThat(r.netWpm()).isEqualTo(5.0);
        }

        @Test
        @DisplayName("ACCURACY_ONLY scales the gross speed by the fraction of correct words")
        void accuracyOnlyModel() {
            // 3 of 4 words correct -> gross 5 WPM scaled by 0.75 = 3.75
            ScoreResult r = score("abcde fghij klmno pqrst", "abcde fghij klmno pqrst",
                    STANDARD.withErrorModel(ErrorModel.ACCURACY_ONLY));

            assertThat(r.grossWpm()).isEqualTo(4.0);
            assertThat(r.netWpm()).isEqualTo(4.0);
            assertThat(r.accuracyPct()).isEqualTo(100.0);
        }

        @Test
        @DisplayName("ACCURACY_ONLY with errors reduces the net speed below gross")
        void accuracyOnlyModelWithErrors() {
            ScoreResult r = score("abcde fghij klmno pqrst", "abcde fghij klmno pqrst",
                    STANDARD.withErrorModel(ErrorModel.ACCURACY_ONLY));

            assertThat(r.netWpm()).isLessThanOrEqualTo(r.grossWpm());
        }

        @Test
        @DisplayName("ACCURACY_ONLY with one wrong word halves the speed")
        void accuracyOnlyHalves() {
            // 4 reference words, 3 correct -> 0.75 ratio. 20 chars / 5 = 4 gross WPM.
            ScoreResult r = score("aaaaa bbbbb ccccc ddddd", "aaaaa bbbbb ccccc dddde",
                    STANDARD.withErrorModel(ErrorModel.ACCURACY_ONLY));

            assertThat(r.grossWpm()).isEqualTo(4.0);
            assertThat(r.accuracyPct()).isEqualTo(75.0);
            assertThat(r.netWpm()).isCloseTo(3.0, within(0.001));
        }
    }

    // ---------------------------------------------------------------------
    // Pass / fail
    // ---------------------------------------------------------------------

    @Nested
    @DisplayName("pass and fail")
    class PassFail {

        @Test
        @DisplayName("meeting the net WPM target passes")
        void passesWhenTargetMet() {
            // 11 words x 5 chars = 55 chars / 5 = 11 words over one minute = 11 gross WPM.
            String text = ("abcde " .repeat(10) + "abcde").trim();
            ScoreResult r = score(text, text, STANDARD.withPassingNetWpm(10.0));

            assertThat(r.grossWpm()).isEqualTo(11.0);
            assertThat(r.netWpm()).isEqualTo(11.0);
            assertThat(r.passed()).isTrue();
        }

        @Test
        @DisplayName("missing the net WPM target fails")
        void failsWhenTargetMissed() {
            ScoreResult r = score("abcde fghij", "abcde fghij", STANDARD.withPassingNetWpm(5.0));

            assertThat(r.grossWpm()).isEqualTo(2.0);
            assertThat(r.netWpm()).isEqualTo(2.0);
            assertThat(r.passed()).isFalse();
        }

        @Test
        @DisplayName("the accuracy floor can fail an otherwise fast run")
        void accuracyFloorFailsRun() {
            // 4 reference words, 2 correct -> 50% accuracy, 4 gross WPM.
            ScoreResult r = score("aaaaa bbbbb ccccc ddddd", "aaaaa bbbbb xxxxx yyyyy",
                    STANDARD.withPassingNetWpm(1.0).withMinAccuracyPct(80.0));

            assertThat(r.netWpm()).isGreaterThan(1.0);
            assertThat(r.accuracyPct()).isEqualTo(50.0);
            assertThat(r.passed()).isFalse();
        }

        @Test
        @DisplayName("net speed never goes negative")
        void netWpmNeverNegative() {
            // Many errors against a short passage drives the penalty above gross speed.
            ScoreResult r = score("a b", "x y z w v u");

            assertThat(r.netWpm()).isGreaterThanOrEqualTo(0.0);
        }
    }

    // ---------------------------------------------------------------------
    // Keystroke accounting
    // ---------------------------------------------------------------------

    @Nested
    @DisplayName("keystroke accounting")
    class KeystrokeAccounting {

        @Test
        @DisplayName("keystrokes and backspaces are carried through to the result")
        void carriesKeystrokes() {
            ScoreResult r = engine.score("abcde fghij", "abcde fghij", STANDARD, 60_000L, 42, 3);

            assertThat(r.keystrokes()).isEqualTo(42);
            assertThat(r.backspaces()).isEqualTo(3);
        }

        @Test
        @DisplayName("negative keystroke counts are clamped to zero")
        void clampsNegativeCounts() {
            ScoreResult r = engine.score("abcde", "abcde", STANDARD, 60_000L, -5, -2);

            assertThat(r.keystrokes()).isZero();
            assertThat(r.backspaces()).isZero();
        }

        @Test
        @DisplayName("a zero elapsed time does not divide by zero")
        void zeroElapsedTime() {
            ScoreResult r = engine.score("abcde fghij", "abcde fghij", STANDARD, 0L, 0, 0);

            assertThat(r.grossWpm()).isGreaterThan(0.0);
            assertThat(r.timeTakenMs()).isZero();
        }
    }

    // ---------------------------------------------------------------------
    // Error breakdown
    // ---------------------------------------------------------------------

    @Nested
    @DisplayName("error breakdown")
    class ErrorBreakdown {

        @Test
        @DisplayName("the breakdown counts every error type")
        void breakdownCounts() {
            // "quick," vs "quick" differs only by punctuation; "The" vs "the" only by case.
            ScoreResult r = score("The quick, brown fox", "the quick brown fox");

            assertThat(r.errorBreakdown()).containsEntry(ErrorType.CASE, 1);
            assertThat(r.errorBreakdown()).containsEntry(ErrorType.PUNCTUATION, 1);
            assertThat(r.errorBreakdown()).doesNotContainKey(ErrorType.WRONG);
        }

        @Test
        @DisplayName("the breakdown is empty for a perfect run")
        void breakdownEmptyForPerfectRun() {
            ScoreResult r = score("the quick brown fox", "the quick brown fox");

            assertThat(r.errorBreakdown()).isEmpty();
        }

        @Test
        @DisplayName("total mistakes sums full and half")
        void totalMistakes() {
            ScoreResult r = score("The quick, brown fox", "the quik brown fox");

            assertThat(r.totalMistakes()).isEqualTo(r.fullMistakes() + r.halfMistakes());
        }
    }

    // ---------------------------------------------------------------------
    // Alignment unit tests
    // ---------------------------------------------------------------------

    @Nested
    @DisplayName("word alignment")
    class Alignment {

        @Test
        @DisplayName("identical sequences align one-to-one")
        void identicalAligns() {
            List<WordAligner.AlignedPair> pairs =
                    WordAligner.align(List.of("a", "b", "c"), List.of("a", "b", "c"));

            assertThat(pairs).hasSize(3);
            assertThat(pairs).allMatch(WordAligner.AlignedPair::isMatch);
        }

        @Test
        @DisplayName("a deletion in the middle shifts the rest of the alignment")
        void deletionShifts() {
            List<WordAligner.AlignedPair> pairs =
                    WordAligner.align(List.of("a", "b", "c", "d"), List.of("a", "c", "d"));

            // a->a, b->(missing), c->c, d->d
            assertThat(pairs).hasSize(4);
            assertThat(pairs.get(0).isMatch()).isTrue();
            assertThat(pairs.get(1).isMissing()).isTrue();
            assertThat(pairs.get(2).isMatch()).isTrue();
            assertThat(pairs.get(3).isMatch()).isTrue();
        }

        @Test
        @DisplayName("an insertion in the middle shifts the rest of the alignment")
        void insertionShifts() {
            List<WordAligner.AlignedPair> pairs =
                    WordAligner.align(List.of("a", "b", "c"), List.of("a", "x", "b", "c"));

            assertThat(pairs).hasSize(4);
            assertThat(pairs.get(1).isExtra()).isTrue();
        }

        @Test
        @DisplayName("an empty typed list aligns to all-missing")
        void emptyTyped() {
            List<WordAligner.AlignedPair> pairs = WordAligner.align(List.of("a", "b"), List.of());

            assertThat(pairs).hasSize(2);
            assertThat(pairs).allMatch(WordAligner.AlignedPair::isMissing);
        }

        @Test
        @DisplayName("an empty reference list aligns to all-extra")
        void emptyReference() {
            List<WordAligner.AlignedPair> pairs = WordAligner.align(List.of(), List.of("a", "b"));

            assertThat(pairs).hasSize(2);
            assertThat(pairs).allMatch(WordAligner.AlignedPair::isExtra);
        }
    }

    // ---------------------------------------------------------------------
    // Rules validation
    // ---------------------------------------------------------------------

    @Nested
    @DisplayName("scoring rules")
    class RulesValidation {

        @Test
        @DisplayName("a non-positive duration is rejected")
        void rejectsBadDuration() {
            org.junit.jupiter.api.Assertions.assertThrows(IllegalArgumentException.class,
                    () -> new ScoringRules(0, 5, ErrorModel.FULL_AND_HALF_MISTAKES, 1.0, 0, 0, true));
        }

        @Test
        @DisplayName("a non-positive word length is rejected")
        void rejectsBadWordLength() {
            org.junit.jupiter.api.Assertions.assertThrows(IllegalArgumentException.class,
                    () -> new ScoringRules(60, 0, ErrorModel.FULL_AND_HALF_MISTAKES, 1.0, 0, 0, true));
        }

        @Test
        @DisplayName("a null error model is rejected")
        void rejectsNullErrorModel() {
            org.junit.jupiter.api.Assertions.assertThrows(NullPointerException.class,
                    () -> new ScoringRules(60, 5, null, 1.0, 0, 0, true));
        }

        @ParameterizedTest
        @MethodSource("com.examtyper.scoring.ScoringEngineTest#standardRuleVariants")
        @DisplayName("rule builders copy the value they change and keep the rest")
        void ruleBuilders(ScoringRules base, ScoringRules changed) {
            assertThat(changed).isNotSameAs(base);
            assertThat(changed.durationSeconds()).isEqualTo(base.durationSeconds());
        }
    }

    static Stream<Arguments> standardRuleVariants() {
        ScoringRules base = ScoringRules.standard(300, 30);
        return Stream.of(
                Arguments.of(base, base.withPassingNetWpm(35)),
                Arguments.of(base, base.withMinAccuracyPct(90)),
                Arguments.of(base, base.withErrorModel(ErrorModel.ACCURACY_ONLY)),
                Arguments.of(base, base.withBackspaceAllowed(false)),
                Arguments.of(base, base.withWordLengthChars(6)),
                Arguments.of(base, base.withErrorPenaltyPerUnit(2.5)));
    }
}
