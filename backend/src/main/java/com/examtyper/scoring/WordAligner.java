package com.examtyper.scoring;

import java.util.ArrayList;
import java.util.List;

/**
 * Aligns the typed words against the reference words.
 *
 * <p>A naive positional comparison would mark every word after a single skipped
 * word as wrong. Instead we run a Levenshtein alignment over the two word
 * sequences and backtrace the edit script, so one omission shifts the alignment
 * instead of destroying it.
 *
 * <p>Substitution cost is 0 for an exact match, {@code SUBSTITUTION_COST} for a
 * near-match (same letters ignoring case/punctuation/spacing) and 1 for a real
 * mismatch. Insertions and deletions cost 1.
 */
final class WordAligner {

    /** Cost of aligning two different words. */
    static final int SUBSTITUTION_COST = 1;
    /** Cost of inserting an extra typed word. */
    static final int INSERTION_COST = 1;
    /** Cost of deleting a missing reference word. */
    static final int DELETION_COST = 1;

    private WordAligner() {
    }

    /**
     * A single aligned pair.
     *
     * @param referenceIndex position in the reference list, or -1 when the typed word is extra
     * @param typedIndex     position in the typed list, or -1 when the reference word is missing
     */
    record AlignedPair(int referenceIndex, int typedIndex) {
        boolean isMatch() {
            return referenceIndex >= 0 && typedIndex >= 0;
        }

        boolean isExtra() {
            return referenceIndex < 0 && typedIndex >= 0;
        }

        boolean isMissing() {
            return referenceIndex >= 0 && typedIndex < 0;
        }
    }

    /**
     * Computes the alignment of {@code typed} against {@code reference}.
     *
     * @param reference reference words, already normalised
     * @param typed     typed words, already normalised
     * @return the ordered list of aligned pairs
     */
    static List<AlignedPair> align(List<String> reference, List<String> typed) {
        int n = reference.size();
        int m = typed.size();

        // dp[i][j] = minimum cost of aligning reference[0..i) with typed[0..j)
        int[][] dp = new int[n + 1][m + 1];
        for (int i = 0; i <= n; i++) {
            dp[i][0] = i * DELETION_COST;
        }
        for (int j = 0; j <= m; j++) {
            dp[0][j] = j * INSERTION_COST;
        }
        for (int i = 1; i <= n; i++) {
            String refWord = reference.get(i - 1);
            for (int j = 1; j <= m; j++) {
                String typedWord = typed.get(j - 1);
                int substitution = dp[i - 1][j - 1] + (refWord.equals(typedWord) ? 0 : SUBSTITUTION_COST);
                int deletion = dp[i - 1][j] + DELETION_COST;
                int insertion = dp[i][j - 1] + INSERTION_COST;
                dp[i][j] = Math.min(substitution, Math.min(deletion, insertion));
            }
        }

        // Backtrace to recover the alignment.
        List<AlignedPair> pairs = new ArrayList<>(n + m);
        int i = n;
        int j = m;
        while (i > 0 || j > 0) {
            if (i > 0 && j > 0) {
                String refWord = reference.get(i - 1);
                String typedWord = typed.get(j - 1);
                int substitution = dp[i - 1][j - 1] + (refWord.equals(typedWord) ? 0 : SUBSTITUTION_COST);
                if (dp[i][j] == substitution) {
                    pairs.add(new AlignedPair(i - 1, j - 1));
                    i--;
                    j--;
                    continue;
                }
            }
            if (i > 0 && dp[i][j] == dp[i - 1][j] + DELETION_COST) {
                pairs.add(new AlignedPair(i - 1, -1));
                i--;
                continue;
            }
            // Insertion: the typed word at j-1 has no reference counterpart.
            pairs.add(new AlignedPair(-1, j - 1));
            j--;
        }
        java.util.Collections.reverse(pairs);
        return pairs;
    }
}
