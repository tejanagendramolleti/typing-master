package com.examtyper.attempt;

/** The lifecycle state of a typing attempt. */
public enum AttemptStatus {
    /** The candidate is still typing. */
    IN_PROGRESS,
    /** The candidate pressed submit. */
    SUBMITTED,
    /** The time ran out and the attempt was submitted automatically. */
    AUTO_SUBMITTED,
    /** The candidate left without submitting. */
    ABANDONED
}
