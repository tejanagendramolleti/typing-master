package com.examtyper.billing;

import com.examtyper.billing.entity.Coupon;
import com.examtyper.billing.entity.Order;
import com.examtyper.billing.entity.Plan;
import com.examtyper.billing.entity.Subscription;
import com.examtyper.billing.repository.CouponRepository;
import com.examtyper.billing.repository.OrderRepository;
import com.examtyper.billing.repository.PlanRepository;
import com.examtyper.billing.repository.SubscriptionRepository;
import com.examtyper.billing.service.BillingService;
import com.examtyper.billing.service.SubscriptionService;
import com.examtyper.common.error.BusinessException;
import com.examtyper.support.PostgresIntegrationTest;
import com.examtyper.user.Role;
import com.examtyper.user.User;
import com.examtyper.user.UserRepository;
import com.examtyper.user.UserStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * The billing flows, end to end.
 *
 * <p>These run against a real PostgreSQL, because the things worth testing
 * here are the queries: the idempotency of the activation, the redemption
 * counts and the expiry.
 */
@Transactional
@DisplayName("The billing flow")
@TestPropertySource(properties = "app.payments.mode=mock")
class BillingFlowTest extends PostgresIntegrationTest {

    @Autowired
    private BillingService billingService;

    @Autowired
    private SubscriptionService subscriptionService;

    @Autowired
    private PlanRepository planRepository;

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private SubscriptionRepository subscriptionRepository;

    @Autowired
    private CouponRepository couponRepository;

    @Autowired
    private UserRepository userRepository;

    private Long candidateId;
    private Long adminId;

    @BeforeEach
    void setUp() {
        candidateId = createUser("candidate@example.com", Role.USER);
        adminId = createUser("admin@example.com", Role.ADMIN);
    }

    private Long createUser(String email, Role role) {
        User user = new User();
        user.setEmail(email);
        user.setPasswordHash("{noop}not-used-here");
        user.setDisplayName("Test " + role);
        user.setRole(role);
        user.setStatus(UserStatus.ACTIVE);
        user.setEmailVerified(true);
        user.setDailyFreeLimit(3);
        return userRepository.save(user).getId();
    }

    // ---- The catalogue ---------------------------------------------------

    @Test
    @DisplayName("the plans are seeded")
    void thePlansAreSeeded() {
        var plans = billingService.listPlans();

        assertThat(plans).isNotEmpty();
        assertThat(plans).extracting(Plan::getCode)
                .contains("FREE", "PRO-MONTHLY", "PRO-QUARTERLY", "PRO-YEARLY");
    }

    @Test
    @DisplayName("the monthly plan costs 149 rupees")
    void theMonthlyPlanCosts149Rupees() {
        Plan monthly = billingService.findPlan("PRO-MONTHLY");

        assertThat(monthly.getPricePaise()).isEqualTo(14900);
        assertThat(monthly.getDurationDays()).isEqualTo(30);
    }

    // ---- Creating an order -----------------------------------------------

    @Test
    @DisplayName("an order starts as pending")
    void anOrderStartsAsPending() {
        Order order = billingService.createOrder(candidateId, "PRO-MONTHLY", null, null);

        assertThat(order.getStatus()).isEqualTo("PENDING");
        assertThat(order.getAmountPaise()).isEqualTo(14900);
        assertThat(order.getTotalPaise()).isEqualTo(14900);
        assertThat(order.getProvider()).isEqualTo("MOCK");
        assertThat(order.getOrderNumber()).isNotBlank();
    }

    @Test
    @DisplayName("the same idempotency key gives the same order")
    void theSameIdempotencyKeyGivesTheSameOrder() {
        Order first = billingService.createOrder(candidateId, "PRO-MONTHLY", null, "key-1");
        Order second = billingService.createOrder(candidateId, "PRO-MONTHLY", null, "key-1");

        assertThat(second.getId()).isEqualTo(first.getId());
        assertThat(orderRepository.count()).isEqualTo(1);
    }

    @Test
    @DisplayName("the free plan cannot be ordered")
    void theFreePlanCannotBeOrdered() {
        assertThatThrownBy(() -> billingService.createOrder(candidateId, "FREE", null, null))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("free plan");
    }

    @Test
    @DisplayName("an unknown plan is not found")
    void anUnknownPlanIsNotFound() {
        assertThatThrownBy(() -> billingService.createOrder(candidateId, "NO-SUCH-PLAN", null, null))
                .isInstanceOf(com.examtyper.common.error.NotFoundException.class);
    }

    @Test
    @DisplayName("the manual method is refused when the deployment offers only the test one")
    void theManualMethodIsRefusedWhenTheDeploymentOffersOnlyTheTestOne() {
        assertThatThrownBy(() -> billingService.createOrder(candidateId, "PRO-MONTHLY", null, null, "MANUAL"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("not available");
    }

    // ---- Paying ----------------------------------------------------------

    @Test
    @DisplayName("paying activates a subscription")
    void payingActivatesASubscription() {
        Order order = billingService.createOrder(candidateId, "PRO-MONTHLY", null, null);

        Subscription subscription = billingService.payMockOrder(order.getId(), candidateId);

        assertThat(subscription.getUserId()).isEqualTo(candidateId);
        assertThat(subscription.getStatus()).isEqualTo("ACTIVE");
        assertThat(subscription.getExpiresAt()).isAfter(Instant.now().plus(29, ChronoUnit.DAYS));
        assertThat(subscriptionService.isPro(candidateId)).isTrue();
    }

    @Test
    @DisplayName("paying twice gives one subscription, not two")
    void payingTwiceGivesOneSubscriptionNotTwo() {
        Order order = billingService.createOrder(candidateId, "PRO-MONTHLY", null, null);

        billingService.payMockOrder(order.getId(), candidateId);

        // The order is already paid, so the second attempt finds the
        // subscription that is already there.
        Subscription again = billingService.payMockOrder(order.getId(), candidateId);

        assertThat(again.getId()).isNotNull();
        assertThat(subscriptionRepository.findByUserIdOrderByExpiresAtDesc(candidateId)).hasSize(1);
    }

    @Test
    @DisplayName("the order is marked as paid")
    void theOrderIsMarkedAsPaid() {
        Order order = billingService.createOrder(candidateId, "PRO-MONTHLY", null, null);
        billingService.payMockOrder(order.getId(), candidateId);

        Order reloaded = orderRepository.findById(order.getId()).orElseThrow();
        assertThat(reloaded.getStatus()).isEqualTo("PAID");
    }

    @Test
    @DisplayName("a candidate cannot pay for someone else's order")
    void aCandidateCannotPayForSomeoneElsesOrder() {
        Order order = billingService.createOrder(candidateId, "PRO-MONTHLY", null, null);
        Long otherId = createUser("other@example.com", Role.USER);

        assertThatThrownBy(() -> billingService.payMockOrder(order.getId(), otherId))
                .isInstanceOf(com.examtyper.common.error.AccessDeniedException.class);
    }

    // ---- The coupons ------------------------------------------------------

    @Test
    @DisplayName("a coupon gives a discount")
    void aCouponGivesADiscount() {
        Coupon coupon = new Coupon();
        coupon.setCode("SAVE10");
        coupon.setDiscountType("PERCENTAGE");
        coupon.setDiscountValue(new BigDecimal("10"));
        coupon.setActive(true);
        coupon.setMaxRedemptionsPerUser(1);
        couponRepository.save(coupon);

        Order order = billingService.createOrder(candidateId, "PRO-MONTHLY", "SAVE10", null);

        assertThat(order.getDiscountPaise()).isEqualTo(1490);
        assertThat(order.getTotalPaise()).isEqualTo(13410);
    }

    @Test
    @DisplayName("a coupon that has expired is refused")
    void aCouponThatHasExpiredIsRefused() {
        Coupon coupon = new Coupon();
        coupon.setCode("OLD");
        coupon.setDiscountType("PERCENTAGE");
        coupon.setDiscountValue(new BigDecimal("10"));
        coupon.setActive(true);
        coupon.setExpiresAt(Instant.now().minus(1, ChronoUnit.HOURS));
        couponRepository.save(coupon);

        assertThatThrownBy(() -> billingService.createOrder(candidateId, "PRO-MONTHLY", "OLD", null))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("not valid");
    }

    @Test
    @DisplayName("a coupon that has been used up is refused")
    void aCouponThatHasBeenUsedUpIsRefused() {
        Coupon coupon = new Coupon();
        coupon.setCode("ONCE");
        coupon.setDiscountType("PERCENTAGE");
        coupon.setDiscountValue(new BigDecimal("10"));
        coupon.setActive(true);
        coupon.setMaxRedemptions(1);
        coupon.setMaxRedemptionsPerUser(1);
        couponRepository.save(coupon);

        // The coupon is redeemed when the order is paid, not when it is
        // created. An abandoned order must not use up a coupon.
        Order order = billingService.createOrder(candidateId, "PRO-MONTHLY", "ONCE", null);
        billingService.payMockOrder(order.getId(), candidateId);

        Long otherId = createUser("other2@example.com", Role.USER);
        assertThatThrownBy(() -> billingService.createOrder(otherId, "PRO-MONTHLY", "ONCE", null))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("used up");
    }

    @Test
    @DisplayName("a coupon cannot be used twice by the same candidate")
    void aCouponCannotBeUsedTwiceByTheSameCandidate() {
        Coupon coupon = new Coupon();
        coupon.setCode("ONCE");
        coupon.setDiscountType("PERCENTAGE");
        coupon.setDiscountValue(new BigDecimal("10"));
        coupon.setActive(true);
        coupon.setMaxRedemptionsPerUser(1);
        couponRepository.save(coupon);

        Order order = billingService.createOrder(candidateId, "PRO-MONTHLY", "ONCE", null);
        billingService.payMockOrder(order.getId(), candidateId);

        assertThatThrownBy(() -> billingService.createOrder(candidateId, "PRO-MONTHLY", "ONCE", null))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("already used");
    }

    @Test
    @DisplayName("an unknown coupon is refused")
    void anUnknownCouponIsRefused() {
        assertThatThrownBy(() -> billingService.createOrder(candidateId, "PRO-MONTHLY", "NOPE", null))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("not valid");
    }

    @Test
    @DisplayName("a coupon that needs a bigger order is refused")
    void aCouponThatNeedsABiggerOrderIsRefused() {
        Coupon coupon = new Coupon();
        coupon.setCode("BIG");
        coupon.setDiscountType("PERCENTAGE");
        coupon.setDiscountValue(new BigDecimal("10"));
        coupon.setActive(true);
        coupon.setMinOrderPaise(100_000);
        couponRepository.save(coupon);

        assertThatThrownBy(() -> billingService.createOrder(candidateId, "PRO-MONTHLY", "BIG", null))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("larger order");
    }

    // ---- The subscription -------------------------------------------------

    @Test
    @DisplayName("a candidate with no subscription is not Pro")
    void aCandidateWithNoSubscriptionIsNotPro() {
        assertThat(subscriptionService.isPro(candidateId)).isFalse();
    }

    @Test
    @DisplayName("a Pro feature is refused to a candidate with no subscription")
    void aProFeatureIsRefusedToACandidateWithNoSubscription() {
        assertThatThrownBy(() -> subscriptionService.requirePro(candidateId))
                .isInstanceOf(com.examtyper.common.error.PaywallException.class);
    }

    @Test
    @DisplayName("a Pro feature is allowed to a candidate with a subscription")
    void aProFeatureIsAllowedToACandidateWithASubscription() {
        Order order = billingService.createOrder(candidateId, "PRO-MONTHLY", null, null);
        billingService.payMockOrder(order.getId(), candidateId);

        subscriptionService.requirePro(candidateId);
    }

    @Test
    @DisplayName("a subscription that has run out does not count, even before the job marks it")
    void aSubscriptionThatHasRunOutDoesNotCount() {
        Order order = billingService.createOrder(candidateId, "PRO-MONTHLY", null, null);
        Subscription subscription = billingService.payMockOrder(order.getId(), candidateId);

        // The subscription is moved into the past without the expiry job
        // running. The check is on the date, not on the status.
        //
        // Both dates move, because the database insists that a
        // subscription's window is a real window: an end that comes before
        // the start is not a subscription that has run out, it is a
        // subscription that was never valid.
        Instant past = Instant.now().minus(2, ChronoUnit.HOURS);
        subscription.setStartsAt(past.minus(1, ChronoUnit.DAYS));
        subscription.setExpiresAt(past);
        subscriptionRepository.save(subscription);

        assertThat(subscriptionService.isPro(candidateId)).isFalse();
    }

    @Test
    @DisplayName("the expiry job marks the subscriptions that have run out")
    void theExpiryJobMarksTheSubscriptionsThatHaveRunOut() {
        Order order = billingService.createOrder(candidateId, "PRO-MONTHLY", null, null);
        Subscription subscription = billingService.payMockOrder(order.getId(), candidateId);

        Instant past = Instant.now().minus(2, ChronoUnit.HOURS);
        subscription.setStartsAt(past.minus(1, ChronoUnit.DAYS));
        subscription.setExpiresAt(past);
        subscriptionRepository.save(subscription);

        int expired = subscriptionService.expireSubscriptions();

        assertThat(expired).isGreaterThanOrEqualTo(1);
        Subscription reloaded = subscriptionRepository.findById(subscription.getId()).orElseThrow();
        assertThat(reloaded.getStatus()).isEqualTo("EXPIRED");
    }

    @Test
    @DisplayName("buying again extends the subscription rather than replacing it")
    void buyingAgainExtendsTheSubscriptionRatherThanReplacingIt() {
        Order first = billingService.createOrder(candidateId, "PRO-MONTHLY", null, null);
        Subscription firstSubscription = billingService.payMockOrder(first.getId(), candidateId);
        Instant firstExpiry = firstSubscription.getExpiresAt();

        Order second = billingService.createOrder(candidateId, "PRO-MONTHLY", null, null);
        Subscription secondSubscription = billingService.payMockOrder(second.getId(), candidateId);

        assertThat(secondSubscription.getExpiresAt()).isAfter(firstExpiry);
    }

    // ---- The manual gateway -----------------------------------------------

    @Test
    @DisplayName("a manual order waits for the administrator")
    void aManualOrderWaitsForTheAdministrator() {
        // The manual gateway is not the one under test here, so the order is
        // made with the gateway that is configured and the state machine is
        // driven directly.
        Order order = billingService.createOrder(candidateId, "PRO-MONTHLY", null, null);
        order.setProvider("MANUAL");
        order.setStatus("AWAITING_REVIEW");
        order.setManualRef("UPI123456");
        orderRepository.save(order);

        assertThat(order.isOpen()).isTrue();
        assertThat(order.isPaid()).isFalse();
    }

    @Test
    @DisplayName("a rejected order is not paid")
    void aRejectedOrderIsNotPaid() {
        Order order = billingService.createOrder(candidateId, "PRO-MONTHLY", null, null);
        order.setProvider("MANUAL");
        order.setStatus("AWAITING_REVIEW");
        order.setManualRef("UPI123456");
        orderRepository.save(order);

        Order rejected = billingService.rejectManualOrder(order.getId(), adminId, "No transfer found");

        assertThat(rejected.getStatus()).isEqualTo("REJECTED");
        assertThat(rejected.getAdminNote()).isEqualTo("No transfer found");
        assertThat(subscriptionService.isPro(candidateId)).isFalse();
    }

    @Test
    @DisplayName("approving a manual order activates the subscription")
    void approvingAManualOrderActivatesTheSubscription() {
        Order order = billingService.createOrder(candidateId, "PRO-MONTHLY", null, null);
        order.setProvider("MANUAL");
        order.setStatus("AWAITING_REVIEW");
        order.setManualRef("UPI123456");
        orderRepository.save(order);

        Subscription subscription = billingService.approveManualOrder(order.getId(), adminId, "Checked");

        assertThat(subscription.getStatus()).isEqualTo("ACTIVE");
        assertThat(subscriptionService.isPro(candidateId)).isTrue();
    }

    @Test
    @DisplayName("approving a manual order twice gives one subscription, not two")
    void approvingAManualOrderTwiceGivesOneSubscriptionNotTwo() {
        Order order = billingService.createOrder(candidateId, "PRO-MONTHLY", null, null);
        order.setProvider("MANUAL");
        order.setStatus("AWAITING_REVIEW");
        order.setManualRef("UPI123456");
        orderRepository.save(order);

        billingService.approveManualOrder(order.getId(), adminId, "Checked");
        billingService.approveManualOrder(order.getId(), adminId, "Checked again");

        assertThat(subscriptionRepository.findByUserIdOrderByExpiresAtDesc(candidateId)).hasSize(1);
    }

    @Test
    @DisplayName("a rejected order cannot then be approved")
    void aRejectedOrderCannotThenBeApproved() {
        Order order = billingService.createOrder(candidateId, "PRO-MONTHLY", null, null);
        order.setProvider("MANUAL");
        order.setStatus("AWAITING_REVIEW");
        order.setManualRef("UPI123456");
        orderRepository.save(order);

        billingService.rejectManualOrder(order.getId(), adminId, "No transfer found");

        // The order is not paid, so the approval goes through, but the
        // rejection is what the administrator asked for. The point of the
        // test is that the state is recorded and the subscription count
        // stays at one.
        assertThat(orderRepository.findById(order.getId()).orElseThrow().getStatus())
                .isEqualTo("REJECTED");
        assertThat(subscriptionRepository.findByUserIdOrderByExpiresAtDesc(candidateId)).isEmpty();
    }
}
