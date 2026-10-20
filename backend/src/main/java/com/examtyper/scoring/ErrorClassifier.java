package com.examtyper.scoring;

/**
 * Decides how two mismatched words differ.
 *
 * <p>The checks run from strictest to loosest so that the most specific
 * explanation wins:
 * <ol>
 *   <li>identical apart from letter case &rarr; {@link ErrorType#CASE}</li>
 *   <li>identical apart from whitespace runs &rarr; {@link ErrorType#SPACING}</li>
 *   <li>identical apart from punctuation and symbols &rarr; {@link ErrorType#PUNCTUATION}</li>
 *   <li>otherwise &rarr; {@link ErrorType#WRONG}</li>
 * </ol>
 */
public final class ErrorClassifier {

    private ErrorClassifier() {
    }

    /**
     * @param expected the reference word
     * @param actual   the typed word
     * @return how the two differ
     */
    public static ErrorType classify(String expected, String actual) {
        if (expected.equals(actual)) {
            return ErrorType.CASE;
        }
        // Only the letter case differs.
        if (expected.equalsIgnoreCase(actual)) {
            return ErrorType.CASE;
        }
        // Only the whitespace differs (extra or missing internal spaces).
        if (TextNormalizer.collapsedWhitespace(expected).equalsIgnoreCase(TextNormalizer.collapsedWhitespace(actual))) {
            return ErrorType.SPACING;
        }
        // Only the punctuation / symbols differ.
        if (TextNormalizer.lettersFolded(expected).equals(TextNormalizer.lettersFolded(actual))) {
            return ErrorType.PUNCTUATION;
        }
        return ErrorType.WRONG;
    }
}
