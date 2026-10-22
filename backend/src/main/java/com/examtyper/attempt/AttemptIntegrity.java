package com.examtyper.attempt;

/**
 * The plausibility checks on the telemetry a client sends with an attempt.
 *
 * <p>The server recomputes every score from the raw text and the recorded
 * events, which stops a client from asserting its own speed. It does not stop
 * a client from <em>composing</em> the telemetry: a client that posts the
 * whole passage as the typed text and a single event with an offset of one
 * millisecond would be believed, and it would post a spectacular speed.
 *
 * <p>These checks look for the two impossibilities — a speed no person could
 * reach, and a body of text that no set of key presses could have produced.
 * They are heuristics, not proofs, and they are deliberately generous: they
 * are built to catch the crude forgeries, not to be a proof of innocence.
 *
 * <p>This class is pure. It has no Spring, JPA or HTTP concerns, so it can be
 * tested on its own.
 */
public final class AttemptIntegrity {

    /**
     * The most code points one key press can produce.
     *
     * <p>In the Indic layouts a single press can add a virama and a
     * consonant to the text, so one press is worth more than one character.
     * Three is the honest ceiling for the layouts in this project and four
     * leaves a margin over it.
     */
    public static final int MAX_CODE_POINTS_PER_KEYSTROKE = 4;

    /**
     * The fastest a person can type, in code points per millisecond.
     *
     * <p>That is a hundred characters a second, which is roughly six times
     * the world record for sustained typing. Anything faster than this was
     * not typed.
     */
    public static final double MAX_CODE_POINTS_PER_MILLISECOND = 0.1d;

    private AttemptIntegrity() {
    }

    /**
     * The outcome of the checks.
     *
     * @param consistent whether the telemetry is plausible
     * @param reason     why it is not, when it is not
     */
    public record Verdict(boolean consistent, String reason) {

        public static Verdict ok() {
            return new Verdict(true, null);
        }

        public static Verdict implausible(String reason) {
            return new Verdict(false, reason);
        }
    }

    /**
     * Checks the telemetry against the text it claims to have produced.
     *
     * @param typedChars the code points in the submitted text, whitespace
     *                   excluded
     * @param keystrokes the key presses the client recorded
     * @param elapsedMs  the time the attempt was measured to take
     * @return whether the telemetry is plausible, and why it is not
     */
    public static Verdict check(int typedChars, int keystrokes, long elapsedMs) {
        if (typedChars <= 0) {
            // Nothing was typed, so there is nothing to be inconsistent with.
            return Verdict.ok();
        }

        if (keystrokes > 0) {
            int ceiling = keystrokes * MAX_CODE_POINTS_PER_KEYSTROKE;
            if (typedChars > ceiling) {
                return Verdict.implausible(
                        "the submitted text holds " + typedChars + " characters, which is more than "
                                + keystrokes + " key presses could have produced");
            }
        }

        long fastestPossibleMs = (long) Math.ceil(typedChars / MAX_CODE_POINTS_PER_MILLISECOND);
        if (elapsedMs < fastestPossibleMs) {
            return Verdict.implausible(
                    "the attempt claims to have typed " + typedChars + " characters in "
                            + elapsedMs + "ms, which is faster than a person can type");
        }

        return Verdict.ok();
    }
}
