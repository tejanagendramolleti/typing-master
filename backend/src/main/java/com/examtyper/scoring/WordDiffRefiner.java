package com.examtyper.scoring;

import java.util.ArrayList;
import java.util.List;

/**
 * Refines a word-level alignment into a human-meaningful error list.
 *
 * <p>Plain Levenshtein alignment over whitespace-separated words cannot see a
 * missing space: typing {@code quickbrown} instead of {@code quick brown}
 * looks like one wrong word rather than one spacing slip, and typing
 * {@code qu ick} looks like two wrong words.
 *
 * <p>This pass looks for those two patterns in the alignment and converts them
 * into a single {@link ErrorType#SPACING} half mistake:
 * <ul>
 *   <li><b>Merged</b> — the candidate typed two reference words as one
 *       (missing a space).</li>
 *   <li><b>Split</b> — the candidate typed one reference word as two
 *       (an extra space).</li>
 * </ul>
 */
final class WordDiffRefiner {

    /**
     * The outcome for one aligned position.
     *
     * @param correct true when the words matched exactly
     * @param diff    the discrepancy, or null when {@code correct} is true
     */
    record RefinedWord(boolean correct, WordDiff diff) {
        static RefinedWord ok() {
            return new RefinedWord(true, null);
        }

        static RefinedWord of(WordDiff diff) {
            return new RefinedWord(false, diff);
        }
    }

    private WordDiffRefiner() {
    }

    /**
     * @param pairs     the raw alignment
     * @param reference reference words
     * @param typed     typed words
     */
    static List<RefinedWord> refine(List<WordAligner.AlignedPair> pairs,
                                     List<String> reference,
                                     List<String> typed) {
        List<RefinedWord> out = new ArrayList<>(pairs.size());
        int i = 0;
        while (i < pairs.size()) {
            WordAligner.AlignedPair current = pairs.get(i);

            // ---- MERGED: two reference words typed as one --------------------
            if (i + 1 < pairs.size()) {
                WordAligner.AlignedPair next = pairs.get(i + 1);
                if (isMerged(current, next, reference, typed)) {
                    out.add(RefinedWord.of(mergedDiff(current, next, reference, typed)));
                    i += 2;
                    continue;
                }
                // ---- SPLIT: one reference word typed as two -----------------
                if (isSplit(current, next, reference, typed)) {
                    out.add(RefinedWord.of(splitDiff(current, next, reference, typed)));
                    i += 2;
                    continue;
                }
            }

            out.add(classifySingle(current, reference, typed));
            i++;
        }
        return out;
    }

    /**
     * True when the pair covers one reference word that was typed as two.
     */
    private static boolean isMerged(WordAligner.AlignedPair current,
                                    WordAligner.AlignedPair next,
                                    List<String> reference,
                                    List<String> typed) {
        // Case 1: current is the missing word, next is the merged typed word.
        if (current.isMissing() && !next.isMissing() && !next.isExtra()
                && next.referenceIndex() == current.referenceIndex() + 1) {
            return mergedEquals(reference, typed, current.referenceIndex(), next.typedIndex());
        }
        // Case 2: current is the merged typed word, next is the missing word.
        if (!current.isMissing() && !current.isExtra() && next.isMissing()
                && next.referenceIndex() == current.referenceIndex() + 1) {
            return mergedEquals(reference, typed, current.referenceIndex(), current.typedIndex());
        }
        return false;
    }

    /** True when {@code typed[j]} is exactly {@code reference[i] + reference[i+1]}. */
    private static boolean mergedEquals(List<String> reference, List<String> typed, int refIndex, int typedIndex) {
        if (refIndex + 1 >= reference.size() || typedIndex < 0 || typedIndex >= typed.size()) {
            return false;
        }
        String expected = reference.get(refIndex) + reference.get(refIndex + 1);
        return expected.equalsIgnoreCase(typed.get(typedIndex));
    }

    /**
     * True when the pair covers two typed words that should have been one.
     */
    private static boolean isSplit(WordAligner.AlignedPair current,
                                   WordAligner.AlignedPair next,
                                   List<String> reference,
                                   List<String> typed) {
        // Case 1: current is the extra typed word, next is the split reference word.
        if (current.isExtra() && !next.isExtra() && !next.isMissing()
                && next.typedIndex() == current.typedIndex() + 1) {
            return splitEquals(reference, typed, next.referenceIndex(), current.typedIndex());
        }
        // Case 2: current is the split reference word, next is the extra typed word.
        if (!current.isExtra() && !current.isMissing() && next.isExtra()
                && next.typedIndex() == current.typedIndex() + 1) {
            return splitEquals(reference, typed, current.referenceIndex(), current.typedIndex());
        }
        return false;
    }

    /** True when {@code reference[i]} is exactly {@code typed[j] + typed[j+1]}. */
    private static boolean splitEquals(List<String> reference, List<String> typed, int refIndex, int typedIndex) {
        if (refIndex < 0 || refIndex >= reference.size() || typedIndex + 1 >= typed.size()) {
            return false;
        }
        String expected = typed.get(typedIndex) + typed.get(typedIndex + 1);
        return expected.equalsIgnoreCase(reference.get(refIndex));
    }

    private static WordDiff mergedDiff(WordAligner.AlignedPair missing,
                                        WordAligner.AlignedPair merged,
                                        List<String> reference,
                                        List<String> typed) {
        int refIndex = missing.isMissing() ? missing.referenceIndex() : merged.referenceIndex();
        int typedIndex = missing.isMissing() ? merged.typedIndex() : missing.typedIndex();
        String expected = reference.get(refIndex) + " " + reference.get(refIndex + 1);
        String actual = typed.get(typedIndex);
        return new WordDiff(ErrorType.SPACING, refIndex, expected, actual);
    }

    private static WordDiff splitDiff(WordAligner.AlignedPair extra,
                                       WordAligner.AlignedPair split,
                                       List<String> reference,
                                       List<String> typed) {
        int refIndex = extra.isExtra() ? split.referenceIndex() : extra.referenceIndex();
        int typedIndex = extra.isExtra() ? extra.typedIndex() : split.typedIndex();
        String expected = reference.get(refIndex);
        String actual = typed.get(typedIndex) + " " + typed.get(typedIndex + 1);
        return new WordDiff(ErrorType.SPACING, refIndex, expected, actual);
    }

    /**
     * Classifies a single aligned position that is not part of a merge or split.
     */
    private static RefinedWord classifySingle(WordAligner.AlignedPair pair,
                                               List<String> reference,
                                               List<String> typed) {
        if (pair.isMatch()) {
            String expected = reference.get(pair.referenceIndex());
            String actual = typed.get(pair.typedIndex());
            if (expected.equals(actual)) {
                return RefinedWord.ok();
            }
            return RefinedWord.of(new WordDiff(
                    ErrorClassifier.classify(expected, actual),
                    pair.referenceIndex(),
                    expected,
                    actual));
        }
        if (pair.isMissing()) {
            return RefinedWord.of(new WordDiff(
                    ErrorType.MISSING, pair.referenceIndex(), reference.get(pair.referenceIndex()), null));
        }
        return RefinedWord.of(new WordDiff(
                ErrorType.EXTRA, pair.typedIndex(), null, typed.get(pair.typedIndex())));
    }
}
