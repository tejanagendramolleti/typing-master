package com.examtyper.scoring;

import java.text.Normalizer;
import java.util.ArrayList;
import java.util.List;

/**
 * Normalises text before comparison.
 *
 * <p>Two independent things happen here:
 * <ul>
 *   <li>Unicode NFC normalisation, so that a Hindi word typed as decomposed
 *       matras compares equal to the same word typed as a precomposed
 *       character, and so that Telugu vowel signs compose consistently.</li>
 *   <li>Word splitting on whitespace, plus a family of comparison keys used to
 *       tell a case-only or punctuation-only error apart from a genuinely
 *       wrong word.</li>
 * </ul>
 *
 * <p><b>Important for Indic scripts:</b> the comparison keys keep combining
 * marks (category {@code Mn}/{@code Mc}/{@code Me}). Devanagari and Telugu
 * matras, viramas and nuktas are combining marks, not letters, so a naive
 * "keep letters and digits" filter would silently delete them and make
 * {@code विद्यालय} and {@code विद्यालयी} compare equal.
 */
public final class TextNormalizer {

    private TextNormalizer() {
    }

    /**
     * Applies NFC normalisation. Safe to call on already-normalised text.
     */
    public static String nfc(String text) {
        if (text == null) {
            return "";
        }
        return Normalizer.normalize(text, Normalizer.Form.NFC);
    }

    /**
     * Splits into words on whitespace after NFC normalisation.
     * Empty tokens are dropped.
     */
    public static List<String> words(String text) {
        List<String> out = new ArrayList<>();
        if (text == null || text.isEmpty()) {
            return out;
        }
        for (String token : nfc(text).split("\\s+")) {
            if (!token.isEmpty()) {
                out.add(token);
            }
        }
        return out;
    }

    /**
     * True for characters that carry the identity of a word: letters, digits and
     * combining marks. Everything else (punctuation, symbols, separators) is
     * treated as decoration.
     */
    private static boolean isWordCharacter(int cp) {
        return switch (Character.getType(cp)) {
            case Character.LOWERCASE_LETTER,
                 Character.UPPERCASE_LETTER,
                 Character.TITLECASE_LETTER,
                 Character.MODIFIER_LETTER,
                 Character.OTHER_LETTER,
                 Character.DECIMAL_DIGIT_NUMBER,
                 Character.LETTER_NUMBER,
                 Character.OTHER_NUMBER,
                 Character.NON_SPACING_MARK,
                 Character.COMBINING_SPACING_MARK,
                 Character.ENCLOSING_MARK -> true;
            default -> false;
        };
    }

    /**
     * Keeps only the characters that identify a word, preserving case.
     * Whitespace, punctuation and symbols are removed.
     */
    public static String letters(String text) {
        if (text == null) {
            return "";
        }
        StringBuilder sb = new StringBuilder(text.length());
        for (int i = 0; i < text.length(); ) {
            int cp = text.codePointAt(i);
            i += Character.charCount(cp);
            if (isWordCharacter(cp)) {
                sb.appendCodePoint(cp);
            }
        }
        return sb.toString();
    }

    /**
     * Like {@link #letters(String)} but case-folded.
     */
    public static String lettersFolded(String text) {
        return letters(text).toLowerCase(java.util.Locale.ROOT);
    }

    /**
     * Removes every whitespace character, keeping everything else (case and
     * punctuation included).
     */
    public static String withoutWhitespace(String text) {
        if (text == null) {
            return "";
        }
        StringBuilder sb = new StringBuilder(text.length());
        for (int i = 0; i < text.length(); ) {
            int cp = text.codePointAt(i);
            i += Character.charCount(cp);
            if (!Character.isWhitespace(cp)) {
                sb.appendCodePoint(cp);
            }
        }
        return sb.toString();
    }

    /**
     * Collapses runs of whitespace into a single space, keeping case and
     * punctuation.
     */
    public static String collapsedWhitespace(String text) {
        if (text == null) {
            return "";
        }
        StringBuilder sb = new StringBuilder(text.length());
        boolean previousWasSpace = true;
        for (int i = 0; i < text.length(); ) {
            int cp = text.codePointAt(i);
            i += Character.charCount(cp);
            if (Character.isWhitespace(cp)) {
                if (!previousWasSpace) {
                    sb.append(' ');
                    previousWasSpace = true;
                }
            } else {
                sb.appendCodePoint(cp);
                previousWasSpace = false;
            }
        }
        int end = sb.length();
        while (end > 0 && sb.charAt(end - 1) == ' ') {
            end--;
        }
        sb.setLength(end);
        return sb.toString();
    }

    /**
     * Counts the characters a candidate actually produced, excluding whitespace.
     * This is what "typed characters" means for the gross-WPM formula.
     */
    public static int countTypedChars(String text) {
        if (text == null || text.isEmpty()) {
            return 0;
        }
        int count = 0;
        String normalised = nfc(text);
        for (int i = 0; i < normalised.length(); ) {
            int cp = normalised.codePointAt(i);
            i += Character.charCount(cp);
            if (!Character.isWhitespace(cp)) {
                count++;
            }
        }
        return count;
    }

    /**
     * Counts the characters in the reference passage, excluding whitespace.
     */
    public static int countReferenceChars(String text) {
        return countTypedChars(text);
    }
}
