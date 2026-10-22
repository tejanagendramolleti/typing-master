package com.examtyper.user;

import com.examtyper.billing.entity.Plan;
import com.examtyper.billing.entity.Subscription;
import com.examtyper.billing.repository.PlanRepository;
import com.examtyper.billing.repository.SubscriptionRepository;
import com.examtyper.common.config.AppProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

/**
 * The demonstration accounts.
 *
 * <p>Three accounts are created when the application starts, so that the
 * interface can be looked at without registering anything first: an
 * administrator, a candidate on the free tier and a candidate with an
 * active Pro subscription. They are development accounts and the seeding
 * can be turned off with {@code SEED_DEMO_USERS=false}.
 *
 * <p>An account that already exists is left alone. A password that has
 * been changed is not changed back on the next restart, and the Pro
 * subscription is only created when the candidate does not have one.
 */
@Component
@ConditionalOnProperty(prefix = "app.seed", name = "demo-users", havingValue = "true", matchIfMissing = true)
public class DemoUserSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DemoUserSeeder.class);

    /** The plan the Pro demonstration account is given. */
    private static final String PRO_PLAN_CODE = "PRO-MONTHLY";

    private final UserRepository userRepository;
    private final PlanRepository planRepository;
    private final SubscriptionRepository subscriptionRepository;
    private final PasswordEncoder passwordEncoder;
    private final AppProperties appProperties;

    public DemoUserSeeder(UserRepository userRepository,
                           PlanRepository planRepository,
                           SubscriptionRepository subscriptionRepository,
                           PasswordEncoder passwordEncoder,
                           AppProperties appProperties) {
        this.userRepository = userRepository;
        this.planRepository = planRepository;
        this.subscriptionRepository = subscriptionRepository;
        this.passwordEncoder = passwordEncoder;
        this.appProperties = appProperties;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments arguments) {
        AppProperties.Seed seed = appProperties.getSeed();

        User admin = createIfAbsent(
                seed.getAdminEmail(),
                seed.getAdminPassword(),
                "Administrator",
                Role.ADMIN);

        createIfAbsent(
                seed.getDemoFreeEmail(),
                seed.getDemoFreePassword(),
                "Free Candidate",
                Role.USER);

        User pro = createIfAbsent(
                seed.getDemoProEmail(),
                seed.getDemoProPassword(),
                "Pro Candidate",
                Role.USER);

        if (pro != null) {
            giveProAccess(pro);
        }

        if (admin != null) {
            log.info("The demonstration accounts are ready. They are for development only.");
        }
    }

    /**
     * Creates an account, unless it is already there.
     *
     * @return the account, or null when it already existed
     */
    private User createIfAbsent(String email, String password, String displayName, Role role) {
        if (email == null || email.isBlank() || password == null || password.isBlank()) {
            return null;
        }

        if (userRepository.existsByEmailIgnoreCase(email)) {
            return null;
        }

        User user = new User();
        user.setEmail(email.trim().toLowerCase());
        user.setPasswordHash(passwordEncoder.encode(password));
        user.setDisplayName(displayName);
        user.setRole(role);
        user.setStatus(UserStatus.ACTIVE);
        // The verification email is mocked, so the seeded accounts start
        // verified, exactly as a registered one does.
        user.setEmailVerified(true);

        User saved = userRepository.save(user);
        log.info("Seeded the {} account {}", role, saved.getEmail());
        return saved;
    }

    /**
     * Gives the Pro candidate an active subscription, if it has none.
     */
    private void giveProAccess(User pro) {
        if (subscriptionRepository.findActiveSubscription(pro.getId(), Instant.now()).isPresent()) {
            return;
        }

        Plan plan = planRepository.findByCode(PRO_PLAN_CODE).orElse(null);
        if (plan == null) {
            log.warn("The plan {} is not in the database, so the Pro demonstration "
                    + "account was created without a subscription.", PRO_PLAN_CODE);
            return;
        }

        Instant now = Instant.now();
        Subscription subscription = new Subscription();
        subscription.setUserId(pro.getId());
        subscription.setPlanId(plan.getId());
        subscription.setProvider("SEED");
        subscription.setProviderRef("seed-" + pro.getId());
        subscription.setStatus("ACTIVE");
        subscription.setStartsAt(now);
        subscription.setExpiresAt(now.plus(plan.getDurationDays(), ChronoUnit.DAYS));

        subscriptionRepository.save(subscription);
        log.info("Gave the Pro demonstration account an active subscription.");
    }
}
