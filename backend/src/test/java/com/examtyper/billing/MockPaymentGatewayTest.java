package com.examtyper.billing;

import com.examtyper.billing.dto.CreateOrderRequest;
import com.examtyper.billing.dto.CreateOrderResult;
import com.examtyper.billing.dto.PaymentVerification;
import com.examtyper.common.config.AppProperties;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.LinkedHashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * The test gateway.
 */
@DisplayName("The mock payment gateway")
class MockPaymentGatewayTest {

    private AppProperties props;
    private MockPaymentGateway gateway;

    @BeforeEach
    void setUp() {
        props = new AppProperties();
        props.setEnv("dev");
        gateway = new MockPaymentGateway(props);
    }

    /**
     * A request for the monthly plan.
     */
    private CreateOrderRequest request() {
        return new CreateOrderRequest(
                1L, "ET123", "PRO-MONTHLY", "Pro Monthly",
                14900, 0, "INR", 7L, "candidate@example.com", null);
    }

    @Test
    @DisplayName("is called MOCK")
    void isCalledMock() {
        assertThat(gateway.providerName()).isEqualTo("MOCK");
    }

    @Test
    @DisplayName("creates a pending order with a reference")
    void createsAPendingOrderWithAReference() {
        CreateOrderResult result = gateway.createOrder(request());

        assertThat(result.status()).isEqualTo("PENDING");
        assertThat(result.providerRef()).isNotBlank();
        assertThat(result.amountPaise()).isEqualTo(14900);
        assertThat(result.currency()).isEqualTo("INR");
    }

    @Test
    @DisplayName("gives each order its own reference")
    void givesEachOrderItsOwnReference() {
        String first = gateway.createOrder(request()).providerRef();
        String second = gateway.createOrder(request()).providerRef();

        assertThat(first).isNotEqualTo(second);
    }

    @Test
    @DisplayName("charges the total, after the discount")
    void chargesTheTotalAfterTheDiscount() {
        CreateOrderRequest discounted = new CreateOrderRequest(
                1L, "ET123", "PRO-MONTHLY", "Pro Monthly",
                14900, 4900, "INR", 7L, "candidate@example.com", null);

        assertThat(gateway.createOrder(discounted).amountPaise()).isEqualTo(10000);
    }

    @Test
    @DisplayName("verifies a payment that has a reference")
    void verifiesAPaymentThatHasAReference() {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("providerRef", "mock_abc123");
        payload.put("orderRef", "ET123");
        payload.put("amountPaise", 14900);

        PaymentVerification verification = gateway.verifyPayment(payload);

        assertThat(verification.isPaid()).isTrue();
        assertThat(verification.providerRef()).isEqualTo("mock_abc123");
        assertThat(verification.amountPaise()).isEqualTo(14900);
    }

    @Test
    @DisplayName("fails a payment that has no reference")
    void failsAPaymentThatHasNoReference() {
        PaymentVerification verification = gateway.verifyPayment(new LinkedHashMap<>());

        assertThat(verification.isFailed()).isTrue();
        assertThat(verification.providerRef()).isNull();
    }

    @Test
    @DisplayName("is available outside production")
    void isAvailableOutsideProduction() {
        assertThat(gateway.isAvailable()).isTrue();
    }

    @Test
    @DisplayName("is not available in production, whatever the configuration says")
    void isNotAvailableInProduction() {
        // A production deployment that is left in mock mode must refuse to
        // take a payment rather than give a subscription away.
        props.setEnv("prod");

        assertThat(gateway.isAvailable()).isFalse();
    }

    @Test
    @DisplayName("does not accept a webhook")
    void doesNotAcceptAWebhook() {
        assertThatThrownBy(() -> gateway.handleWebhook(Map.of(), "{}"))
                .isInstanceOf(UnsupportedOperationException.class);
    }
}
