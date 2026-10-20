package com.examtyper.attempt.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

/**
 * The payload a client sends when submitting a finished attempt.
 *
 * <p>The typed text and the timing events are all the server needs: the score
 * is recomputed from them, so nothing here is trusted as a result.
 */
public record SubmitAttemptRequest(
        @NotNull(message = "Typed text is required")
        @Size(max = 200_000, message = "Typed text is too long")
        String typedText,

        /**
         * The recorded events. Each carries an offset in milliseconds from the
         * start of the attempt.
         */
        @Size(max = 100_000, message = "Too many events")
        List<TimingEvent> events,

        /** True when the client submitted because the timer ran out. */
        Boolean autoSubmitted
) {
    /**
     * A single recorded event.
     *
     * @param type    one of KEYSTROKE, BACKSPACE, BLUR, FOCUS, PASTE_ATTEMPT,
     *                DROP_ATTEMPT, COPY_ATTEMPT, CONTEXT_MENU
     * @param offsetMs milliseconds since the attempt started
     * @param charIndex position in the typed text, when known
     * @param charValue the character produced, when known
     * @param keyCode the physical key, when known
     */
    public record TimingEvent(
            @NotNull(message = "Event type is required")
            String type,

            @NotNull(message = "Event offset is required")
            Long offsetMs,

            Integer charIndex,

            @Size(max = 8)
            String charValue,

            @Size(max = 20)
            String keyCode
    ) {
    }
}
