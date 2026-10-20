package com.examtyper.billing.service;

import com.examtyper.billing.entity.Subscription;
import com.examtyper.billing.repository.SubscriptionRepository;
import com.examtyper.common.error.PaywallException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;

/**
 * The subscription service: the authority on whether a candidate is Pro.
 *
 * <p>Every check asks the same question — is there a subscription that is
 * active and has not run out — so there is one answer and one place to
 * change it.
 */
@Service
public class SubscriptionService {

    private static final Logger log = LoggerFactory.getLogger(SubscriptionService.class);

    private final SubscriptionRepository subscriptionRepository;
    private final BillingService billingService;
    private final RenewalReminderService renewalReminderService;

    public SubscriptionService(SubscriptionRepository subscriptionRepository,
                               BillingService billingService,
                               RenewalReminderService renewalReminderService) {
        this.subscriptionRepository = subscriptionRepository;
        this.billingService = billingService;
        this.renewalReminderService = renewalReminderService;
    }

    /**
     * The candidate's active subscription, if there is one.
     */
    @Transactional(readOnly = true)
    public Optional<Subscription> findActive(Long userId) {
        return subscriptionRepository.findActiveSubscription(userId, Instant.now());
    }

    /**
     * True when the candidate has an active subscription.
     */
    @Transactional(readOnly = true)
    public boolean isPro(Long userId) {
        return findActive(userId).isPresent();
    }

    /**
     * Fails when the candidate does not have an active subscription.
     *
     * <p>This is the server-side gate. The interface hides a Pro feature
     * from a free candidate, but this is what actually stops them.
     *
     * @throws PaywallException when the candidate is not Pro
     */
    public void requirePro(Long userId) {
        if (!isPro(userId)) {
            throw new PaywallException("A Pro subscription is required for this feature.");
        }
    }

    /**
     * Marks the subscriptions that have run out.
     *
     * <p>The check when a candidate is gated is on the date, not on this
     * status, so a subscription stops counting the moment it ends even if
     * this job has not run. The job keeps the reports and the admin view
     * honest.
     */
    @Scheduled(cron = "0 15 * * * *")
    @Transactional
    public int expireSubscriptions() {
        Instant now = Instant.now();
        List<Subscription> expired = subscriptionRepository.findExpiredActiveSubscriptions(now);
        for (Subscription subscription : expired) {
            subscription.setStatus("EXPIRED");
        }
        subscriptionRepository.saveAll(expired);
        if (!expired.isEmpty()) {
            log.info("Marked {} subscriptions as expired", expired.size());
        }
        return expired.size();
    }

    /**
     * Reminds the candidates whose subscription ends soon.
     */
    @Scheduled(cron = "0 0 9 * * *")
    @Transactional(readOnly = true)
    public void sendRenewalReminders() {
        Instant now = Instant.now();
        List<Subscription> expiring = subscriptionRepository
                .findExpiringBetween(now, now.plus(7, ChronoUnit.DAYS));
        for (Subscription subscription : expiring) {
            renewalReminderService.sendRenewalReminder(subscription);
        }
        if (!expiring.isEmpty()) {
            log.info("Sent {} renewal reminders", expiring.size());
        }
    }
}
