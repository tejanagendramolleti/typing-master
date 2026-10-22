package com.examtyper.billing;

import com.examtyper.billing.dto.AdminOrderResponse;
import com.examtyper.billing.dto.OrderResponse;
import com.examtyper.billing.entity.Order;
import com.examtyper.billing.repository.OrderRepository;
import com.examtyper.billing.service.BillingService;
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
import org.springframework.test.context.TestPropertySource;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * The billing flows of a deployment that offers both payment methods.
 *
 * <p>The candidate chooses how to pay at the checkout, so the order has to
 * remember which method it was made with, and the two methods have to stay
 * apart: the test gateway pays itself, and the manual one waits for an
 * administrator.
 */
@Transactional
@DisplayName("Both payment methods on offer")
@TestPropertySource(properties = "app.payments.mode=both")
class BillingMethodsTest extends PostgresIntegrationTest {

    @Autowired
    private BillingService billingService;

    @Autowired
    private PaymentGatewayRegistry gateways;

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private UserRepository userRepository;

    private Long candidateId;

    @BeforeEach
    void setUp() {
        candidateId = createUser("buyer@example.com", Role.USER);
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

    @Test
    @DisplayName("both methods are on offer")
    void bothMethodsAreOnOffer() {
        assertThat(gateways.availableMethods())
                .containsExactly(PaymentGatewayRegistry.MOCK, PaymentGatewayRegistry.MANUAL);
        assertThat(gateways.isEnabled()).isTrue();
    }

    @Test
    @DisplayName("the candidate chooses the method the order is made with")
    void theCandidateChoosesTheMethodTheOrderIsMadeWith() {
        Order manual = billingService.createOrder(candidateId, "PRO-MONTHLY", null, null, "MANUAL");
        Order mock = billingService.createOrder(candidateId, "PRO-MONTHLY", null, null, "MOCK");

        assertThat(manual.getProvider()).isEqualTo("MANUAL");
        assertThat(manual.getStatus()).isEqualTo("AWAITING_REVIEW");
        assertThat(mock.getProvider()).isEqualTo("MOCK");
        assertThat(mock.getStatus()).isEqualTo("PENDING");
    }

    @Test
    @DisplayName("a manual order waits for the administrator and does not pay itself")
    void aManualOrderWaitsForTheAdministratorAndDoesNotPayItself() {
        Order order = billingService.createOrder(candidateId, "PRO-MONTHLY", null, null, "MANUAL");

        assertThatThrownBy(() -> billingService.payMockOrder(order.getId(), candidateId))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("test method");
    }

    @Test
    @DisplayName("a method the deployment does not offer is refused")
    void aMethodTheDeploymentDoesNotOfferIsRefused() {
        assertThatThrownBy(() -> billingService.createOrder(candidateId, "PRO-MONTHLY", null, null, "CARDPOS"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("not available");
    }

    @Test
    @DisplayName("the administrator sees whose order it is")
    void theAdministratorSeesWhoseOrderItIs() {
        Order order = billingService.createOrder(candidateId, "PRO-MONTHLY", null, null, "MANUAL");

        AdminOrderResponse view = billingService.toAdminResponse(order);

        assertThat(view.userEmail()).isEqualTo("buyer@example.com");
        assertThat(view.planName()).isEqualTo("Pro Monthly");
        assertThat(view.orderNumber()).isEqualTo(order.getOrderNumber());
        assertThat(view.totalPaise()).isEqualTo(14900);
    }

    @Test
    @DisplayName("the candidate sees which plan the order was for")
    void theCandidateSeesWhichPlanTheOrderWasFor() {
        Order order = billingService.createOrder(candidateId, "PRO-MONTHLY", null, null, "MOCK");

        OrderResponse view = billingService.toResponse(order);

        assertThat(view.planCode()).isEqualTo("PRO-MONTHLY");
        assertThat(view.planName()).isEqualTo("Pro Monthly");
    }

    @Test
    @DisplayName("the same idempotency key gives the same order, whatever the method")
    void theSameIdempotencyKeyGivesTheSameOrderWhateverTheMethod() {
        Order first = billingService.createOrder(candidateId, "PRO-MONTHLY", null, "key-both", "MANUAL");
        Order second = billingService.createOrder(candidateId, "PRO-MONTHLY", null, "key-both", "MANUAL");

        assertThat(second.getId()).isEqualTo(first.getId());
        assertThat(orderRepository.count()).isEqualTo(1);
    }
}
