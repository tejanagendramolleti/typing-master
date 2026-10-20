package com.examtyper.billing;

import com.examtyper.billing.dto.CreateOrderRequest;
import com.examtyper.billing.dto.CreateOrderResult;
import com.examtyper.billing.dto.PaymentVerification;
import com.examtyper.billing.dto.WebhookResult;

import java.util.Map;

/**
 * A payment provider.
 *
 * The interface is deliberately provider-neutral: a method that creates an
 * order, a method that checks a payment, and a method that handles a
 * webhook. Everything above it in the application — the order state
 * machine, the subscription, the gating — is written against this
 * interface and not against any particular provider.
 *
 * <p>No real provider is wired in this build. {@link MockPaymentGateway} and
 * {@link ManualGateway} are the two implementations, and a real one can be
 * added later without changing anything above this line. See
 * {@code docs/ADDING_RAZORPAY.md}.
 */
public interface PaymentGateway {

    /**
     * The provider's name, stored on the order and the payment.
     *
     * <p>The values in the database are {@code MOCK} and {@code MANUAL}. A
     * real provider would add its own.
     */
    String providerName();

    /**
     * Creates an order with the provider.
     *
     * @param request the plan, the user and the coupon
     * @return what the provider returned, in a provider-neutral shape
     */
    CreateOrderResult createOrder(CreateOrderRequest request);

    /**
     * Checks a payment the provider has reported.
     *
     * @param payload the provider's own payload, whatever shape it is
     * @return the result in a provider-neutral shape
     */
    PaymentVerification verifyPayment(Map<String, Object> payload);

    /**
     * Handles a webhook from the provider.
     *
     * @param headers the request headers
     * @param body    the raw request body
     * @return the result in a provider-neutral shape
     */
    WebhookResult handleWebhook(Map<String, String> headers, String body);

    /**
     * True when this gateway can be used right now.
     *
     * <p>The mock gateway is only available outside production, and the
     * manual gateway needs an administrator to approve the orders.
     */
    boolean isAvailable();
}
