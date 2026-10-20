package com.examtyper.attempt;

import com.examtyper.billing.service.SubscriptionService;
import com.examtyper.common.error.ErrorCode;
import com.examtyper.common.error.QuotaExceededException;
import com.examtyper.user.User;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.ZoneId;
import java.time.ZonedDateTime;

/**
 * The daily allowance.
 *
 * <p>The free tier allows three tests a day. The count is kept on the
 * server, in the {@code attempts} table, so clearing the browser does not
 * give another three — the allowance is the same on every device the
 * candidate uses.
 *
 * <p>The day starts at midnight in the server's time zone, not in the
 * candidate's. A candidate in another zone sees their allowance change at
 * an hour that is slightly odd for them, which is the price of a limit
 * that is the same for everybody and cannot be dodged by moving the clock.
 * See {@code KNOWN_ISSUES.md}.
 */
@Service
public class QuotaService {

    private static final Logger log = LoggerFactory.getLogger(QuotaService.class);

    /** The number of free tests a day. */
    public static final int DEFAULT_DAILY_LIMIT = 3;

    private final AttemptRepository attemptRepository;
    private final SubscriptionService subscriptionService;

    public QuotaService(AttemptRepository attemptRepository, SubscriptionService subscriptionService) {
        this.attemptRepository = attemptRepository;
        this.subscriptionService = subscriptionService;
    }

    /**
     * How the candidate stands today.
     *
     * @param user the candidate
     */
    @Transactional(readOnly = true)
    public QuotaStatus status(User user) {
        boolean isPro = subscriptionService.isPro(user.getId());
        int limit = user.getDailyFreeLimit() > 0 ? user.getDailyFreeLimit() : DEFAULT_DAILY_LIMIT;

        if (isPro) {
            // A Pro member has no daily limit, so nothing is counted and
            // the limit is reported as the number used.
            return new QuotaStatus(0, Integer.MAX_VALUE, Integer.MAX_VALUE, true, nextReset());
        }

        long used = attemptRepository.countSince(user.getId(), startOfToday());
        int remaining = (int) Math.max(0, limit - used);
        return new QuotaStatus((int) used, limit, remaining, false, nextReset());
    }

    /**
     * Fails when the candidate has used their free allowance.
     *
     * <p>This is the server-side gate. The interface shows a prompt, but
     * this is what actually stops the fourth test.
     *
     * @throws QuotaExceededException when the allowance is spent
     */
    @Transactional(readOnly = true)
    public void requireQuota(User user) {
        QuotaStatus status = status(user);
        if (!status.isPro() && status.remaining() <= 0) {
            log.info("Candidate {} has used their daily allowance", user.getId());
            throw new QuotaExceededException(
                    "You have used today's " + status.limit() + " free tests. "
                            + "Upgrade to Pro for unlimited practice.");
        }
    }

    /**
     * The start of the current day, in the server's time zone.
     */
    private Instant startOfToday() {
        ZoneId zone = ZoneId.systemDefault();
        ZonedDateTime start = ZonedDateTime.now(zone).toLocalDate().atStartOfDay(zone);
        return start.toInstant();
    }

    /**
     * When the allowance resets.
     */
    private Instant nextReset() {
        ZoneId zone = ZoneId.systemDefault();
        ZonedDateTime start = ZonedDateTime.now(zone).toLocalDate().plusDays(1).atStartOfDay(zone);
        return start.toInstant();
    }

    /**
     * Where the candidate stands against the daily allowance.
     *
     * @param used      the tests taken today
     * @param limit     the allowance
     * @param remaining what is left
     * @param isPro     true when the candidate has no limit
     * @param resetsAt  when the allowance resets
     */
    public record QuotaStatus(
            int used,
            int limit,
            int remaining,
            boolean isPro,
            Instant resetsAt
    ) {
    }
}
