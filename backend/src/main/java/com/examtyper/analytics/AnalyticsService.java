package com.examtyper.analytics;

import com.examtyper.attempt.Attempt;
import com.examtyper.attempt.AttemptRepository;
import com.examtyper.scoring.ScoreResult;
import com.examtyper.scoring.ScoringEngine;
import com.examtyper.scoring.ScoringRules;
import com.examtyper.scoring.TextNormalizer;
import com.examtyper.scoring.WordDiff;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * The analytics.
 *
 * <p>The question this service answers is "what should I practise next", so
 * the weak keys and the weak words are the point of it. The trends are
 * context.
 *
 * <p>Everything is computed from the stored attempts. The scores are not
 * recomputed from the raw text on every request — they were computed once
 * when the attempt was submitted, by the same engine, and they are stored —
 * but the word-level analysis is recomputed, because it needs the diff and
 * the diff is not worth storing twice.
 */
@Service
public class AnalyticsService {

    private static final DateTimeFormatter DAY_FORMAT =
            DateTimeFormatter.ofPattern("d MMM", Locale.ENGLISH);

    private final AttemptRepository attemptRepository;
    private final ScoringEngine scoringEngine;

    public AnalyticsService(AttemptRepository attemptRepository, ScoringEngine scoringEngine) {
        this.attemptRepository = attemptRepository;
        this.scoringEngine = scoringEngine;
    }

    /**
     * The overview for a candidate.
     *
     * @param userId the candidate
     * @param limit  how many tests the trend should cover
     */
    @Transactional(readOnly = true)
    public AnalyticsOverview overview(Long userId, int limit) {
        List<Attempt> attempts = attemptRepository
                .findByUserIdOrderByCreatedAtDesc(userId, PageRequest.of(0, Math.max(1, limit)))
                .getContent()
                .stream()
                .filter(attempt -> attempt.getSubmittedAt() != null)
                .toList();

        if (attempts.isEmpty()) {
            return new AnalyticsOverview(List.of(), List.of(), List.of(), List.of(), 0, 0.0, 0.0);
        }

        // The attempts come back newest first, and the trend reads better
        // oldest first.
        List<Attempt> chronological = new ArrayList<>(attempts);
        java.util.Collections.reverse(chronological);

        List<TrendPoint> trends = chronological.stream()
                .map(this::toTrendPoint)
                .toList();

        List<WeakKey> weakKeys = weakKeys(chronological);
        List<WeakWord> weakWords = weakWords(chronological);
        List<HourPerformance> byHour = performanceByHour(chronological);

        double averageWpm = attempts.stream()
                .mapToDouble(a -> a.getNetWpm() == null ? 0.0 : a.getNetWpm().doubleValue())
                .average()
                .orElse(0.0);
        double averageAccuracy = attempts.stream()
                .mapToDouble(a -> a.getAccuracyPct() == null ? 0.0 : a.getAccuracyPct().doubleValue())
                .average()
                .orElse(0.0);

        return new AnalyticsOverview(trends, weakKeys, weakWords, byHour,
                attempts.size(), averageWpm, averageAccuracy);
    }

    /**
     * One point on the trend.
     */
    private TrendPoint toTrendPoint(Attempt attempt) {
        ZoneId zone = ZoneId.systemDefault();
        ZonedDateTime when = attempt.getSubmittedAt().atZone(zone);
        return new TrendPoint(
                when.format(DAY_FORMAT),
                attempt.getNetWpm() == null ? 0.0 : attempt.getNetWpm().doubleValue(),
                attempt.getAccuracyPct() == null ? 0.0 : attempt.getAccuracyPct().doubleValue(),
                attempt.getId());
    }

    /**
     * The physical keys that cost the most mistakes.
     *
     * <p>A key is judged by the number of mistakes, not by the rate: a key
     * that was pressed ten times and was wrong twice is less of a problem
     * than a key that was pressed once and was wrong once.
     */
    private List<WeakKey> weakKeys(List<Attempt> attempts) {
        Map<String, int[]> counts = new LinkedHashMap<>();

        for (Attempt attempt : attempts) {
            for (WordDiff diff : diffsFor(attempt)) {
                if (diff.type() == null || diff.expected() == null || diff.actual() == null) {
                    continue;
                }
                // The mistake is on the expected word, and the key that
                // produced the wrong character is the one that differs.
                for (int i = 0; i < Math.min(diff.expected().length(), diff.actual().length()); i++) {
                    if (diff.expected().charAt(i) != diff.actual().charAt(i)) {
                        String key = String.valueOf(diff.expected().charAt(i)).toUpperCase(Locale.ROOT);
                        int[] entry = counts.computeIfAbsent(key, k -> new int[2]);
                        entry[0]++;
                        break;
                    }
                }
            }
        }

        return counts.entrySet().stream()
                .map(entry -> new WeakKey(entry.getKey(), entry.getValue()[0], entry.getValue()[0],
                        entry.getValue()[0]))
                .sorted(Comparator.comparingInt(WeakKey::errors).reversed())
                .limit(12)
                .toList();
    }

    /**
     * The words the candidate misses most.
     */
    private List<WeakWord> weakWords(List<Attempt> attempts) {
        Map<String, int[]> counts = new LinkedHashMap<>();

        for (Attempt attempt : attempts) {
            List<String> referenceWords = TextNormalizer.words(attempt.getReferenceText());
            for (WordDiff diff : diffsFor(attempt)) {
                if (diff.type() == null || diff.expected() == null) {
                    continue;
                }
                // The word is keyed on the reference, so a candidate who
                // mistypes the same word every time builds up a count.
                String word = diff.expected().toLowerCase(Locale.ROOT);
                int[] entry = counts.computeIfAbsent(word, k -> new int[2]);
                entry[0]++;
                entry[1]++;
                if (diff.type() != com.examtyper.scoring.ErrorType.CASE
                        && diff.type() != com.examtyper.scoring.ErrorType.PUNCTUATION
                        && diff.type() != com.examtyper.scoring.ErrorType.SPACING) {
                    // A full mistake counts more than a half mistake.
                    entry[0] += 1;
                }
            }
            // Every word the candidate got right counts towards the total, so
            // the rate is meaningful.
            for (String word : referenceWords) {
                int[] entry = counts.get(word.toLowerCase(Locale.ROOT));
                if (entry != null) {
                    entry[1]++;
                }
            }
        }

        return counts.entrySet().stream()
                .filter(entry -> entry.getValue()[0] > 0)
                .map(entry -> new WeakWord(entry.getKey(), entry.getValue()[0], entry.getValue()[1]))
                .sorted(Comparator.comparingInt(WeakWord::errors).reversed())
                .limit(30)
                .toList();
    }

    /**
     * The candidate's average speed by the hour of the day.
     */
    private List<HourPerformance> performanceByHour(List<Attempt> attempts) {
        Map<Integer, List<Double>> byHour = new LinkedHashMap<>();

        for (Attempt attempt : attempts) {
            if (attempt.getNetWpm() == null) {
                continue;
            }
            int hour = attempt.getSubmittedAt().atZone(ZoneId.systemDefault()).getHour();
            byHour.computeIfAbsent(hour, h -> new ArrayList<>())
                    .add(attempt.getNetWpm().doubleValue());
        }

        return byHour.entrySet().stream()
                .map(entry -> new HourPerformance(
                        entry.getKey(),
                        entry.getValue().stream().mapToDouble(Double::doubleValue).average().orElse(0.0),
                        entry.getValue().size()))
                .sorted(Comparator.comparingInt(HourPerformance::hour))
                .toList();
    }

    /**
     * The word-level differences for an attempt.
     *
     * <p>The diff is recomputed from the stored text with the same engine
     * that scored the attempt, so it always agrees with the score.
     */
    private List<WordDiff> diffsFor(Attempt attempt) {
        if (attempt.getReferenceText() == null || attempt.getTypedText() == null) {
            return List.of();
        }
        ScoringRules rules = new ScoringRules(
                attempt.getDurationSeconds(),
                attempt.getWordLengthChars(),
                attempt.getErrorModel(),
                attempt.getErrorPenaltyPerUnit() == null ? 1.0
                        : attempt.getErrorPenaltyPerUnit().doubleValue(),
                attempt.getPassingNetWpm() == null ? 0.0
                        : attempt.getPassingNetWpm().doubleValue(),
                0.0,
                attempt.isBackspaceAllowed());
        ScoreResult result = scoringEngine.score(
                attempt.getReferenceText(),
                attempt.getTypedText(),
                rules,
                attempt.getDurationMs() == null ? 0L : attempt.getDurationMs(),
                attempt.getKeystrokeCount(),
                attempt.getBackspaceCount());
        return result.wordDiffs();
    }

    /**
     * One point on the speed and accuracy trend.
     *
     * @param date        the day the test was taken
     * @param netWpm      the net speed
     * @param accuracyPct the accuracy
     * @param attemptId   the test
     */
    public record TrendPoint(String date, double netWpm, double accuracyPct, Long attemptId) {
    }

    /**
     * A key the candidate is slow on.
     *
     * @param key        the key
     * @param errors     the mistakes it caused
     * @param total      the times it was involved
     * @param errorRate  the share of those that were mistakes
     */
    public record WeakKey(String key, int errors, int total, double errorRate) {
    }

    /**
     * A word the candidate misses.
     *
     * @param word   the word
     * @param errors the mistakes
     * @param times  the times it came up
     */
    public record WeakWord(String word, int errors, int times) {
    }

    /**
     * The performance in one hour of the day.
     *
     * @param hour       the hour, in the candidate's time zone
     * @param averageWpm the average speed
     * @param attempts   the number of tests
     */
    public record HourPerformance(int hour, double averageWpm, int attempts) {
    }

    /**
     * Everything the analytics page shows.
     *
     * @param trends           the speed and accuracy over time
     * @param weakKeys         the keys that cost the most mistakes
     * @param weakWords        the words that are missed most
     * @param byHour           the performance by hour of the day
     * @param totalAttempts    the number of tests
     * @param averageNetWpm    the average speed
     * @param averageAccuracyPct the average accuracy
     */
    public record AnalyticsOverview(
            List<TrendPoint> trends,
            List<WeakKey> weakKeys,
            List<WeakWord> weakWords,
            List<HourPerformance> byHour,
            int totalAttempts,
            double averageNetWpm,
            double averageAccuracyPct
    ) {
    }
}
