package com.examtyper.billing;

import com.examtyper.billing.dto.CreateOrderRequest;
import com.examtyper.billing.dto.CreateOrderResult;
import com.examtyper.billing.dto.PaymentVerification;
import com.examtyper.billing.dto.WebhookResult;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

/**
 * The manual gateway: the candidate pays by UPI and says so.
 *
 * <p>The candidate gets the account details, makes the transfer, and gives
 * the transaction reference. An administrator then approves or rejects the
 * request. Nothing is activated until the approval, and the approval is
 * idempotent, so pressing it twice cannot give the candidate two
 * subscriptions.
 *
 * <p>This is a real workflow rather than a mock: the money genuinely moves,
 * and the only thing the application does not do is talk to a bank.
 *
 * <p>Which gateways a deployment offers is decided by
 * {@link PaymentGatewayRegistry}, so this one is registered whatever the
 * mode says and simply left out when it is not wanted.
 */
@Component
public class ManualGateway implements PaymentGateway {

    private static final Logger log = LoggerFactory.getLogger(ManualGateway.class);

    /** The provider name stored on the order. */
    public static final String PROVIDER = "MANUAL";

    @Override
    public String providerName() {
        return PROVIDER;
    }

    @Override
    public CreateOrderResult createOrder(CreateOrderRequest request) {
        // The reference is the order's own number, because the administrator
        // matches the UPI reference against it.
        Map<String, String> details = new LinkedHashMap<>();
        details.put("method", "UPI");
        details.put("instructions",
                "Make the transfer and enter the UPI transaction reference. "
                        + "An administrator will approve it.");

        log.info("Manual order {} for plan {} at {} paise", request.orderNumber(),
                request.planCode(), request.totalPaise());

        return new CreateOrderResult(
                PROVIDER,
                request.orderNumber(),
                "AWAITING_REVIEW",
                request.totalPaise(),
                request.currency(),
                null,
                details);
    }

    @Override
    public PaymentVerification verifyPayment(Map<String, Object> payload) {
        String manualRef = asString(payload.get("manualRef"));
        String orderRef = asString(payload.get("orderRef"));

        if (manualRef == null || manualRef.isBlank()) {
            // A manual payment without a reference cannot be matched to a
            // bank statement, so it is not a payment yet.
            return new PaymentVerification(PROVIDER, null, orderRef, "PENDING", 0, "INR",
                    "UPI", null, payload);
        }

        return new PaymentVerification(PROVIDER, manualRef, orderRef, "PAID",
                asInt(payload.get("amountPaise")), "INR", "UPI", null, payload);
    }

    @Override
    public WebhookResult handleWebhook(Map<String, String> headers, String body) {
        throw new UnsupportedOperationException(
                "The manual gateway does not accept webhooks. An administrator approves "
                        + "the order in the admin panel.");
    }

    @Override
    public boolean isAvailable() {
        return true;
    }

    /** A fresh reference, for the tests and for the manual order's own number. */
    static String newReference() {
        return "manual_" + UUID.randomUUID().toString().replace("-", "").substring(0, 16);
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
