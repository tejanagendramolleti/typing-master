package com.examtyper.billing.service;

import com.examtyper.billing.entity.Subscription;
import com.examtyper.billing.repository.PlanRepository;
import com.examtyper.common.config.AppProperties;
import com.examtyper.user.User;
import com.examtyper.user.UserRepository;
import com.examtyper.user.mail.MailSender;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

/**
 * Sends the renewal reminders.
 *
 * <p>It is a separate class from the subscription service so that the
 * reminder's wording lives in one place, and so that a reminder can be
 * written without touching the expiry logic.
 */
@Service
public class RenewalReminderService {

    private static final Logger log = LoggerFactory.getLogger(RenewalReminderService.class);

    private final MailSender mailSender;
    private final UserRepository userRepository;
    private final PlanRepository planRepository;
    private final AppProperties props;

    public RenewalReminderService(MailSender mailSender,
                                  UserRepository userRepository,
                                  PlanRepository planRepository,
                                  AppProperties props) {
        this.mailSender = mailSender;
        this.userRepository = userRepository;
        this.planRepository = planRepository;
        this.props = props;
    }

    /**
     * Sends the reminder for one subscription.
     */
    public void sendRenewalReminder(Subscription subscription) {
        User user = userRepository.findById(subscription.getUserId()).orElse(null);
        if (user == null) {
            return;
        }

        String planName = planRepository.findById(subscription.getPlanId())
                .map(plan -> plan.getName())
                .orElse("your plan");

        String expiresOn = DateTimeFormatter.ofPattern("d MMMM yyyy", Locale.ENGLISH)
                .format(subscription.getExpiresAt().atZone(ZoneId.of("UTC")));

        String body = """
                Hello %s,

                Your %s subscription on ExamTyper ends on %s.

                When it ends, the full mock series, the detailed analytics and the
                downloadable reports stop. The free tier stays open: three practice
                tests a day, and your results.

                If you would like to continue, you can renew from the pricing page.

                — ExamTyper
                """.formatted(
                user.getDisplayName() == null ? user.getEmail() : user.getDisplayName(),
                planName,
                expiresOn);

        try {
            mailSender.send(user.getEmail(), "Your ExamTyper subscription ends soon", body);
        } catch (RuntimeException e) {
            // A reminder that cannot be sent must not stop the job, or the
            // other candidates would not get theirs either.
            log.warn("Could not send the renewal reminder to user {}", subscription.getUserId(), e);
        }
    }
}
