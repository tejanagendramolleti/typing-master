package com.examtyper.scoring;

/**
 * Classification of a single word-level discrepancy.
 */
public enum ErrorType {

    /** The word was typed but does not match the reference. */
    WRONG,

    /** The reference word was never typed. */
    MISSING,

    /** An extra word was typed that does not exist in the reference. */
    EXTRA,

    /** The word matches apart from letter case. */
    CASE,

    /** The word matches apart from punctuation. */
    PUNCTUATION,

    /** The word matches apart from internal whitespace only. */
    SPACING;

    /** A full mistake costs a whole word of speed; a half mistake costs half. */
    public boolean isFull() {
        return this == WRONG || this == MISSING || this == EXTRA;
    }

    public boolean isHalf() {
        return !isFull();
    }
}
