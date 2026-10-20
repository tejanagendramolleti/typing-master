package com.examtyper.scoring;

/**
 * A single word-level discrepancy between the reference passage and what the
 * candidate actually typed.
 *
 * @param type    what kind of discrepancy this is
 * @param index   position of the word in the reference (or in the typed text for {@link ErrorType#EXTRA})
 * @param expected the reference word (null for {@link ErrorType#EXTRA})
 * @param actual  the typed word (null for {@link ErrorType#MISSING})
 */
public record WordDiff(ErrorType type, int index, String expected, String actual) {

    public boolean isFullMistake() {
        return type.isFull();
    }

    public boolean isHalfMistake() {
        return type.isHalf();
    }
}
