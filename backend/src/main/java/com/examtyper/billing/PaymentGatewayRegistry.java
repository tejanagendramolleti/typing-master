package com.examtyper.billing;

import com.examtyper.common.config.AppProperties;
import com.examtyper.common.error.BusinessException;
import com.examtyper.common.error.ErrorCode;
import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;

/**
 * The payment methods a deployment offers.
 *
 * <p>There is more than one implementation of {@link PaymentGateway} in the
 * application — the development gateway and the manual one — and which of
 * them a candidate may use is a deployment decision, not a code one. The
 * {@code app.payments.mode} setting says which:
 *
 * <ul>
 *   <li>{@code mock} — only the development gateway, which takes the money
 *       without any money changing hands. This is the default.</li>
 *   <li>{@code manual} — only the UPI method, where the candidate pays and
 *       an administrator approves the request.</li>
 *   <li>{@code both} — both of them, and the candidate chooses at the
 *       checkout.</li>
 *   <li>{@code disabled} — neither, and the pricing page shows a waitlist
 *       form instead of a checkout.</li>
 * </ul>
 *
 * <p>Every gateway is registered here whatever the mode says, and the mode
 * decides which of them are offered. That way the wiring never depends on
 * the configuration, and a deployment that switches from one method to
 * another does not change which beans exist.
 *
 * @see PaymentGateway
 */
@Component
public class PaymentGatewayRegistry {

    /** The provider name of the development gateway. */
    public static final String MOCK = "MOCK";

    /** The provider name of the manual, UPI method. */
    public static final String MANUAL = "MANUAL";

    private final AppProperties appProperties;
    private final Map<String, PaymentGateway> byProvider = new LinkedHashMap<>();

    public PaymentGatewayRegistry(AppProperties appProperties, List<PaymentGateway> gateways) {
        this.appProperties = appProperties;
        for (PaymentGateway gateway : gateways) {
            byProvider.put(normalise(gateway.providerName()), gateway);
        }
    }

    /**
     * The methods this deployment offers, in the order they are shown.
     *
     * <p>A gateway that says it is not available is left out. The
     * development gateway is not available in production, so a production
     * deployment left in mock mode offers no method at all rather than
     * offering one that would refuse the payment.
     */
    public List<String> availableMethods() {
        List<String> wanted = switch (mode()) {
            case "disabled" -> List.of();
            case "both" -> List.of(MOCK, MANUAL);
            case "manual" -> List.of(MANUAL);
            case "mock" -> List.of(MOCK);
            default -> List.of();
        };

        return wanted.stream()
                .filter(provider -> {
                    PaymentGateway gateway = byProvider.get(provider);
                    return gateway != null && gateway.isAvailable();
                })
                .toList();
    }

    /**
     * True when a candidate can pay for something.
     */
    public boolean isEnabled() {
        return !availableMethods().isEmpty();
    }

    /**
     * The method used when the candidate does not choose one.
     *
     * <p>The development gateway is preferred, because it is the one that
     * completes on its own.
     */
    public String defaultMethod() {
        List<String> methods = availableMethods();
        if (methods.contains(MOCK)) {
            return MOCK;
        }
        return methods.isEmpty() ? null : methods.get(0);
    }

    /**
     * The gateway for a provider's name.
     */
    public Optional<PaymentGateway> find(String provider) {
        if (provider == null || provider.isBlank()) {
            return Optional.empty();
        }
        return Optional.ofNullable(byProvider.get(normalise(provider)));
    }

    /**
     * The gateway for a method the candidate asked for.
     *
     * @throws BusinessException when the method is not one this deployment
     *                           offers
     */
    public PaymentGateway require(String provider) {
        String method = provider == null || provider.isBlank() ? defaultMethod() : normalise(provider);

        if (method == null) {
            throw new BusinessException(ErrorCode.PAYMENT_DISABLED,
                    "Payments are switched off in this deployment.");
        }
        if (!availableMethods().contains(method)) {
            throw new BusinessException(ErrorCode.VALIDATION_FAILED,
                    "That payment method is not available here.");
        }

        PaymentGateway gateway = byProvider.get(method);
        if (gateway == null) {
            throw new BusinessException(ErrorCode.VALIDATION_FAILED,
                    "That payment method is not available here.");
        }
        return gateway;
    }

    /** The configured mode, in lower case. */
    private String mode() {
        String configured = appProperties.getPayments().getMode();
        return configured == null ? "mock" : configured.trim().toLowerCase(Locale.ROOT);
    }

    /** A provider's name in the form the keys use. */
    private static String normalise(String provider) {
        return provider == null ? "" : provider.trim().toUpperCase(Locale.ROOT);
    }
}
