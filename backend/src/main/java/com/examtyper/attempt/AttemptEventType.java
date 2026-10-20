package com.examtyper.attempt;

/**
 * The kinds of telemetry recorded during an attempt.
 *
 * <p>The keystroke and backspace events carry the timing data the server uses
 * to recompute the score. The remaining types are anti-cheat signals.
 */
public enum AttemptEventType {
    KEYSTROKE,
    BACKSPACE,
    BLUR,
    FOCUS,
    PASTE_ATTEMPT,
    DROP_ATTEMPT,
    COPY_ATTEMPT,
    CONTEXT_MENU
}
