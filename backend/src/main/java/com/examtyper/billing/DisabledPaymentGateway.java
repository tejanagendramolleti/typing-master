package com.examtyper.billing;

import com.examtyper.billing.dto.CreateOrderRequest;
import com.examtyper.billing.dto.CreateOrderResult;
import com.examtyper.billing.dto.PaymentVerification;
import com.examtyper.billing.dto.WebhookResult;
import com.examtyper.common.error.BusinessException;
import com.examtyper.common.error.ErrorCode;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * The gateway used when payments are switched off.
 *
 * <p>It exists so that the application always has exactly one
 * {@link PaymentGateway} bean and the wiring never depends on the
 * configuration. Every method refuses, and the pricing page shows a
 * waitlist form instead of a checkout.
 */
@Component
@ConditionalOnProperty(name = "app.payments.mode", havingValue = "disabled", matchIfMissing = true)
public class DisabledPaymentGateway implements PaymentGateway {

    /** The provider name stored on the order. */
    public static final String PROVIDER = "DISABLED";

    @Override
    public String providerName() {
        return PROVIDER;
    }

    @Override
    public CreateOrderResult createOrder(CreateOrderRequest request) {
        throw new BusinessException(ErrorCode.PAYMENT_DISABLED,
                "Payments are switched off in this deployment.");
    }

    @Override
    public PaymentVerification verifyPayment(Map<String, Object> payload) {
        throw new BusinessException(ErrorCode.PAYMENT_DISABLED,
                "Payments are switched off in this deployment.");
    }

    @Override
    public WebhookResult handleWebhook(Map<String, String> headers, String body) {
        throw new BusinessException(ErrorCode.PAYMENT_DISABLED,
                "Payments are switched off in this deployment.");
    }

    @Override
    public boolean isAvailable() {
        return false;
    }
}
