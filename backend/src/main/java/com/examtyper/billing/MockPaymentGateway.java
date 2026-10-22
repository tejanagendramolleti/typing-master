package com.examtyper.billing;

import com.examtyper.billing.dto.CreateOrderRequest;
import com.examtyper.billing.dto.CreateOrderResult;
import com.examtyper.billing.dto.PaymentVerification;
import com.examtyper.billing.dto.WebhookResult;
import com.examtyper.common.config.AppProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

/**
 * The development gateway: takes the money without any money changing hands.
 *
 * <p>The candidate presses a "Pay (test)" button and the order is marked
 * paid. There is no provider, no signature and no money, so this gateway is
 * only available outside production. The check is on
 * {@code app.env}, not on the gateway being selected, so a production
 * deployment that is left in mock mode refuses to take a payment rather
 * than giving one away.
 *
 * <p>Which gateways a deployment offers is decided by
 * {@link PaymentGatewayRegistry}, so this one is registered whatever the
 * mode says and simply left out when it is not wanted.
 */
@Component
public class MockPaymentGateway implements PaymentGateway {

    private static final Logger log = LoggerFactory.getLogger(MockPaymentGateway.class);

    /** The provider name stored on the order. */
    public static final String PROVIDER = "MOCK";

    private final AppProperties props;

    public MockPaymentGateway(AppProperties props) {
        this.props = props;
    }

    @Override
    public String providerName() {
        return PROVIDER;
    }

    @Override
    public CreateOrderResult createOrder(CreateOrderRequest request) {
        String providerRef = "mock_" + UUID.randomUUID().toString().replace("-", "").substring(0, 20);

        Map<String, String> details = new LinkedHashMap<>();
        details.put("mock", "true");
        details.put("plan", request.planCode());
        details.put("order", request.orderNumber());

        log.info("Mock order {} for plan {} at {} paise", request.orderNumber(), request.planCode(),
                request.totalPaise());

        return new CreateOrderResult(
                PROVIDER,
                providerRef,
                "PENDING",
                request.totalPaise(),
                request.currency(),
                null,
                details);
    }

    @Override
    public PaymentVerification verifyPayment(Map<String, Object> payload) {
        String providerRef = asString(payload.get("providerRef"));
        String orderRef = asString(payload.get("orderRef"));
        int amount = asInt(payload.get("amountPaise"));

        if (providerRef == null || providerRef.isBlank()) {
            return new PaymentVerification(PROVIDER, null, orderRef, "FAILED", 0, null, null, null, payload);
        }

        return new PaymentVerification(PROVIDER, providerRef, orderRef, "PAID", amount, "INR",
                "MOCK", "mock-signature", payload);
    }

    @Override
    public WebhookResult handleWebhook(Map<String, String> headers, String body) {
        // The mock gateway has no webhook. A caller that reaches this is
        // looking for a provider that does not exist.
        throw new UnsupportedOperationException(
                "The mock gateway does not accept webhooks. There is no provider behind it.");
    }

    @Override
    public boolean isAvailable() {
        // The mock gateway must never be reachable in production, whatever
        // the configuration says.
        return !"prod".equalsIgnoreCase(props.getEnv());
    }

    private static String asString(Object value) {
        return value == null ? null : String.valueOf(value);
    }

    private static int asInt(Object value) {
        if (value instanceof Number number) {
            return number.intValue();
        }
        if (value == null) {
            return 0;
        }
        try {
            return Integer.parseInt(String.valueOf(value));
        } catch (NumberFormatException e) {
            return 0;
        }
    }
}
