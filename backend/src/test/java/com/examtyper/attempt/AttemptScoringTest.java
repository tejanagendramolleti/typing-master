package com.examtyper.attempt;

import com.examtyper.attempt.dto.AttemptResponse;
import com.examtyper.attempt.dto.AttemptResultResponse;
import com.examtyper.attempt.dto.StartAttemptRequest;
import com.examtyper.attempt.dto.SubmitAttemptRequest;
import com.examtyper.support.PostgresIntegrationTest;
import com.examtyper.user.Role;
import com.examtyper.user.User;
import com.examtyper.user.UserRepository;
import com.examtyper.user.UserStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * The attempt lifecycle, end to end against a real database.
 *
 * <p>Two things are checked here that no other test covers. The first is the
 * accuracy floor: the exam profile asks for ninety per cent, and the floor
 * has to be carried all the way from the profile to the verdict. The second
 * is the telemetry check: a client that posts a result it could not have
 * typed must not be passed.
 */
@Transactional
@DisplayName("The attempt scoring")
class AttemptScoringTest extends PostgresIntegrationTest {

    /** The exam used throughout: it asks for 35 net wpm and 90% accuracy. */
    private static final String EXAM = "SSC-CHSL-EN";

    /**
     * How long each key press is assumed to take, in milliseconds.
     *
     * <p>Ten characters a second is a fast but possible rate. It puts the
     * clean run well above the thirty-five word bar, so the run that fails
     * the accuracy floor fails on the floor and not on the speed.
     */
    private static final long INTERVAL_MS = 100L;

    /** Every eighth word is typed wrong, which is about twelve per cent. */
    private static final int CORRUPT_EVERY = 8;

    @Autowired
    private AttemptService attemptService;

    @Autowired
    private AttemptRepository attemptRepository;

    @Autowired
    private UserRepository userRepository;

    private Long candidateId;

    @BeforeEach
    void setUp() {
        User user = new User();
        user.setEmail("candidate@example.com");
        user.setPasswordHash("{noop}not-used-here");
        user.setDisplayName("Test Candidate");
        user.setRole(Role.USER);
        user.setStatus(UserStatus.ACTIVE);
        user.setEmailVerified(true);
        user.setDailyFreeLimit(3);
        candidateId = userRepository.save(user).getId();
    }

    // ---- The accuracy floor ------------------------------------------------

    @Test
    @DisplayName("the accuracy floor is copied onto the attempt when it starts")
    void theAccuracyFloorIsCopiedOntoTheAttempt() {
        AttemptResponse attempt = start();

        assertThat(attempt.minAccuracyPct()).isEqualTo(90.0d);

        Attempt stored = attemptRepository.findById(attempt.attemptId()).orElseThrow();
        assertThat(stored.getMinAccuracyPct()).isEqualByComparingTo("90.00");
    }

    @Test
    @DisplayName("a clean run passes")
    void aCleanRunPasses() {
        AttemptResponse attempt = start();

        AttemptResultResponse result = submit(attempt, attempt.referenceText(),
                eventsFor(attempt.referenceText()));

        assertThat(result.accuracyPct()).isEqualTo(100.0d);
        assertThat(result.netWpm()).isGreaterThanOrEqualTo(35.0d);
        assertThat(result.passed()).isTrue();
    }

    @Test
    @DisplayName("a run below the accuracy floor does not pass, however fast it was")
    void aRunBelowTheAccuracyFloorDoesNotPassHoweverFastItWas() {
        AttemptResponse attempt = start();

        // Most of the passage is right, but not enough of it, and the run is
        // fast enough to clear the speed bar on its own.
        String sloppy = corruptEveryNthWord(attempt.referenceText(), CORRUPT_EVERY);

        AttemptResultResponse result = submit(attempt, sloppy, eventsFor(sloppy));

        assertThat(result.netWpm())
                .as("the speed bar is cleared, so the accuracy floor is what fails the run")
                .isGreaterThanOrEqualTo(35.0d);
        assertThat(result.accuracyPct()).isLessThan(90.0d);
        assertThat(result.passed()).isFalse();
    }

    @Test
    @DisplayName("the result reports the floor the attempt was marked against")
    void theResultReportsTheFloorTheAttemptWasMarkedAgainst() {
        AttemptResponse attempt = start();

        AttemptResultResponse result = submit(attempt, attempt.referenceText(),
                eventsFor(attempt.referenceText()));

        assertThat(result.minAccuracyPct()).isEqualTo(90.0d);
    }

    // ---- The telemetry check -----------------------------------------------

    @Test
    @DisplayName("a passage posted with a single event is flagged and does not pass")
    void aPassagePostedWithASingleEventIsFlaggedAndDoesNotPass() {
        AttemptResponse attempt = start();

        // The crude forgery: the whole passage, typed in one millisecond.
        List<SubmitAttemptRequest.TimingEvent> forged = List.of(
                new SubmitAttemptRequest.TimingEvent("KEYSTROKE", 1L, 0, "t", null));

        AttemptResultResponse result = submit(attempt, attempt.referenceText(), forged);

        assertThat(result.accuracyPct()).isEqualTo(100.0d);
        assertThat(result.netWpm()).isGreaterThan(35.0d);
        assertThat(result.passed()).isFalse();
        assertThat(result.cheatFlags()).contains("IMPOSSIBLE_TELEMETRY");
    }

    @Test
    @DisplayName("an honest run is not flagged")
    void anHonestRunIsNotFlagged() {
        AttemptResponse attempt = start();

        AttemptResultResponse result = submit(attempt, attempt.referenceText(),
                eventsFor(attempt.referenceText()));

        assertThat(result.cheatFlags()).isEmpty();
    }

    // ---- The helpers -------------------------------------------------------

    private AttemptResponse start() {
        return attemptService.start(candidateId, new StartAttemptRequest(EXAM, null, null, null));
    }

    private AttemptResultResponse submit(AttemptResponse attempt,
                                         String typedText,
                                         List<SubmitAttemptRequest.TimingEvent> events) {
        return attemptService.submit(candidateId, attempt.attemptId(),
                new SubmitAttemptRequest(typedText, events, false));
    }

    /**
     * One event per character, spaced the way a person would space them.
     */
    private static List<SubmitAttemptRequest.TimingEvent> eventsFor(String text) {
        List<SubmitAttemptRequest.TimingEvent> events = new ArrayList<>();
        long offset = 0L;
        for (int i = 0; i < text.length(); i++) {
            char c = text.charAt(i);
            if (Character.isWhitespace(c)) {
                continue;
            }
            offset += INTERVAL_MS;
            events.add(new SubmitAttemptRequest.TimingEvent("KEYSTROKE", offset, i, String.valueOf(c), null));
        }
        return events;
    }

    /**
     * Types every nth word wrong, keeping the length of the text and the word
     * boundaries the same, so that only the accuracy changes.
     */
    private static String corruptEveryNthWord(String text, int every) {
        String[] words = text.split(" ", -1);
        StringBuilder out = new StringBuilder(text.length());
        for (int i = 0; i < words.length; i++) {
            if (i > 0) {
                out.append(' ');
            }
            boolean corrupt = i > 0 && i % every == 0;
            out.append(corrupt ? changeEveryLetter(words[i]) : words[i]);
        }
        return out.toString();
    }

    /**
     * Replaces every letter with a different letter, so the word cannot be
     * the word it was.
     */
    private static String changeEveryLetter(String word) {
        StringBuilder out = new StringBuilder(word.length());
        for (int i = 0; i < word.length(); i++) {
            char c = word.charAt(i);
            if (Character.isLetter(c)) {
                out.append(c == 'z' ? 'y' : 'z');
            } else {
                out.append(c);
            }
        }
        return out.toString();
    }
}
