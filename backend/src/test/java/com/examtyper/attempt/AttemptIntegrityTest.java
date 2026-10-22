package com.examtyper.attempt;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * The plausibility checks on the telemetry.
 *
 * <p>These are the checks that stop a client from posting a result it could
 * not have typed.
 */
@DisplayName("The attempt integrity checks")
class AttemptIntegrityTest {

    @Test
    @DisplayName("an ordinary run is consistent")
    void anOrdinaryRunIsConsistent() {
        // Four hundred characters in forty seconds, one key press each.
        AttemptIntegrity.Verdict verdict = AttemptIntegrity.check(400, 400, 40_000L);

        assertThat(verdict.consistent()).isTrue();
        assertThat(verdict.reason()).isNull();
    }

    @Test
    @DisplayName("an empty attempt is consistent")
    void anEmptyAttemptIsConsistent() {
        AttemptIntegrity.Verdict verdict = AttemptIntegrity.check(0, 0, 1L);

        assertThat(verdict.consistent()).isTrue();
    }

    @Test
    @DisplayName("a run with no recorded events is not judged on the keystrokes")
    void aRunWithNoRecordedEventsIsNotJudgedOnTheKeystrokes() {
        // A client that records no events at all is unusual, but it is not
        // proof of anything, so the keystroke check does not apply to it.
        AttemptIntegrity.Verdict verdict = AttemptIntegrity.check(400, 0, 40_000L);

        assertThat(verdict.consistent()).isTrue();
    }

    @Test
    @DisplayName("a run with no recorded events is still judged on the time")
    void aRunWithNoRecordedEventsIsStillJudgedOnTheTime() {
        // Four hundred characters in one millisecond is not a person typing.
        AttemptIntegrity.Verdict verdict = AttemptIntegrity.check(400, 0, 1L);

        assertThat(verdict.consistent()).isFalse();
        assertThat(verdict.reason()).contains("faster than a person can type");
    }

    @Test
    @DisplayName("a passage posted with one event is not consistent")
    void aPassagePostedWithOneEventIsNotConsistent() {
        // The crude forgery: the whole passage, typed in one millisecond.
        AttemptIntegrity.Verdict verdict = AttemptIntegrity.check(800, 1, 1L);

        assertThat(verdict.consistent()).isFalse();
        assertThat(verdict.reason()).contains("key presses could have produced");
    }

    @Test
    @DisplayName("a text longer than the key presses could have produced is not consistent")
    void aTextLongerThanTheKeyPressesCouldHaveProducedIsNotConsistent() {
        AttemptIntegrity.Verdict verdict = AttemptIntegrity.check(500, 10, 60_000L);

        assertThat(verdict.consistent()).isFalse();
        assertThat(verdict.reason()).contains("key presses could have produced");
    }

    @Test
    @DisplayName("an Indic run is consistent even though one key can make three characters")
    void anIndicRunIsConsistentEvenThoughOneKeyCanMakeThreeCharacters() {
        // A Devanagari conjunct is a consonant, a virama and another
        // consonant, and a matra adds a fourth character, so one key press
        // can be worth more than one character of text.
        AttemptIntegrity.Verdict verdict = AttemptIntegrity.check(300, 100, 30_000L);

        assertThat(verdict.consistent()).isTrue();
    }

    @Test
    @DisplayName("a very fast run is not consistent")
    void aVeryFastRunIsNotConsistent() {
        // Two hundred characters in a tenth of a second.
        AttemptIntegrity.Verdict verdict = AttemptIntegrity.check(200, 200, 100L);

        assertThat(verdict.consistent()).isFalse();
        assertThat(verdict.reason()).contains("faster than a person can type");
    }

    @Test
    @DisplayName("a run at the fastest a person can type is consistent")
    void aRunAtTheFastestAPersonCanTypeIsConsistent() {
        // A hundred characters a second is about six times the world record
        // for sustained typing, so a run at that rate is allowed.
        int chars = 600;
        long elapsed = (long) Math.ceil(chars / AttemptIntegrity.MAX_CODE_POINTS_PER_MILLISECOND);

        AttemptIntegrity.Verdict verdict = AttemptIntegrity.check(chars, chars, elapsed);

        assertThat(verdict.consistent()).isTrue();
    }
}
