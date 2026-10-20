package com.examtyper.drills;

import java.util.List;

/**
 * Generates the text for a drill.
 *
 * <p>The drill itself is algorithmic: the words, the keys and the lengths
 * come from the candidate's own history, and that part needs no language
 * model. The generator is here for the one thing an algorithm cannot do
 * well — write natural prose that happens to contain the words the
 * candidate gets wrong.
 *
 * <p>The interface exists so that a real model can be added later without
 * changing the drill logic. The implementation that ships assembles
 * passages from templates and the existing passage bank, and needs no key,
 * no network and no money.
 */
public interface PassageGenerator {

    /**
     * Generates a passage for a drill.
     *
     * @param request what the drill needs
     * @return the generated passage
     */
    GeneratedPassage generate(DrillRequest request);

    /**
     * True when this generator can be used right now.
     */
    boolean isAvailable();

    /**
     * What the drill needs from a generator.
     *
     * @param language   the language to write in
     * @param focusWords the words the candidate gets wrong
     * @param focusKeys  the keys the candidate is slow on
     * @param wordCount  how long the passage should be
     */
    record DrillRequest(
            String language,
            List<String> focusWords,
            List<String> focusKeys,
            int wordCount
    ) {
    }

    /**
     * A generated passage.
     *
     * @param title    the title
     * @param content  the text
     * @param language the language
     * @param source   where it came from
     */
    record GeneratedPassage(
            String title,
            String content,
            String language,
            String source
    ) {
    }
}
