package com.examtyper.leaderboard;

import com.examtyper.attempt.Attempt;
import com.examtyper.attempt.AttemptRepository;
import com.examtyper.attempt.AttemptStatus;
import com.examtyper.user.User;
import com.examtyper.user.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.temporal.TemporalAdjusters;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * The leaderboard.
 *
 * <p>Two boards: the week's and the whole time. Both are per exam, because
 * a candidate who is fast in Hindi and slow in English should not be
 * measured against the English typists.
 *
 * <p>Privacy is handled by the name that is shown, not by hiding the
 * candidate. A candidate who has opted out is left off the board entirely.
 * A candidate who has asked for their email to be shown has it shown, and
 * everybody else is shown as their display name.
 */
@Service
public class LeaderboardService {

    private final AttemptRepository attemptRepository;
    private final UserRepository userRepository;

    public LeaderboardService(AttemptRepository attemptRepository, UserRepository userRepository) {
        this.attemptRepository = attemptRepository;
        this.userRepository = userRepository;
    }

    /**
     * The board for an exam.
     *
     * @param examCode the exam
     * @param period   WEEK, ALL_TIME or MONTH
     * @param limit    how many rows to return
     */
    @Transactional(readOnly = true)
    public List<LeaderboardEntry> board(String examCode, LeaderboardPeriod period, int limit) {
        Instant since = period.since();

        List<Attempt> attempts = attemptRepository.findFinishedForExam(examCode, since);

        if (attempts.isEmpty()) {
            return List.of();
        }

        // The best result per candidate, which is what a board of speeds
        // should show.
        Map<Long, Attempt> bestPerUser = attempts.stream()
                .filter(attempt -> attempt.getNetWpm() != null)
                .collect(Collectors.toMap(
                        Attempt::getUserId,
                        Function.identity(),
                        (first, second) -> first.getNetWpm().compareTo(second.getNetWpm()) >= 0
                                ? first : second));

        Map<Long, User> users = userRepository.findAllById(bestPerUser.keySet()).stream()
                .collect(Collectors.toMap(User::getId, Function.identity()));

        return bestPerUser.values().stream()
                .map(attempt -> toEntry(attempt, users.get(attempt.getUserId())))
                .filter(java.util.Objects::nonNull)
                .sorted(java.util.Comparator
                        .comparingDouble(LeaderboardEntry::netWpm).reversed()
                        .thenComparingDouble(LeaderboardEntry::accuracyPct).reversed())
                .limit(Math.max(1, Math.min(100, limit)))
                .toList();
    }

    /**
     * Turns an attempt into a row.
     *
     * <p>A candidate who has opted out is not on the board at all, and a
     * candidate with no display name is shown by the first part of their
     * email address, so the board is readable without being identifying.
     */
    private LeaderboardEntry toEntry(Attempt attempt, User user) {
        if (user == null || user.isLeaderboardOptOut()) {
            return null;
        }

        String name = user.getDisplayName();
        if (name == null || name.isBlank()) {
            String email = user.getEmail();
            name = email.substring(0, email.indexOf('@'));
        }

        return new LeaderboardEntry(
                user.getId(),
                name,
                user.isShowEmailOnLeaderboard() ? user.getEmail() : null,
                attempt.getExamCode(),
                attempt.getNetWpm() == null ? 0.0 : attempt.getNetWpm().doubleValue(),
                attempt.getAccuracyPct() == null ? 0.0 : attempt.getAccuracyPct().doubleValue(),
                attempt.getSubmittedAt());
    }

    /**
     * The periods a board can cover.
     */
    public enum LeaderboardPeriod {

        /** The last seven days. */
        WEEK,
        /** The last thirty days. */
        MONTH,
        /** Everything. */
        ALL_TIME;

        /**
         * When the period starts, or null when it covers everything.
         */
        public Instant since() {
            ZoneId zone = ZoneId.systemDefault();
            return switch (this) {
                case WEEK -> {
                    ZonedDateTime monday = LocalDate.now(zone)
                            .with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY))
                            .atStartOfDay(zone);
                    yield monday.toInstant();
                }
                case MONTH -> LocalDate.now(zone).minusDays(30).atStartOfDay(zone).toInstant();
                case ALL_TIME -> null;
            };
        }

        /**
         * The period with this name, or the week when the name is not one
         * that is known.
         */
        public static LeaderboardPeriod of(String name) {
            if (name == null) {
                return WEEK;
            }
            return switch (name.trim().toUpperCase(java.util.Locale.ROOT)) {
                case "ALL", "ALL_TIME", "ALLTIME" -> ALL_TIME;
                case "MONTH" -> MONTH;
                default -> WEEK;
            };
        }
    }

    /**
     * One row of the board.
     *
     * @param userId      the candidate
     * @param name        the name that is shown
     * @param email       the email, when the candidate has asked for it
     * @param examCode    the exam
     * @param netWpm      the speed
     * @param accuracyPct the accuracy
     * @param achievedAt  when the result was achieved
     */
    public record LeaderboardEntry(
            Long userId,
            String name,
            String email,
            String examCode,
            double netWpm,
            double accuracyPct,
            Instant achievedAt
    ) {
    }
}
