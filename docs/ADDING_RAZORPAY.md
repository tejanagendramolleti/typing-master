# Adding a real payment provider

**There is no payment provider in this build.** There is no Razorpay code, no
Razorpay key and no Razorpay dependency in this repository, and none should
be added without reading this document first.

The billing layer was written to be provider-neutral on purpose, so that
adding a real provider is a small, well-understood change rather than a
rewrite. This document describes that change. It is a guide, not an
implementation: nothing here has been written.

---

## What is already there

The three things every provider needs are already defined, in
`backend/src/main/java/com/examtyper/billing/`:

```java
public interface PaymentGateway {
    String providerName();
    CreateOrderResult createOrder(CreateOrderRequest request);
    PaymentVerification verifyPayment(Map<String, Object> payload);
    WebhookResult handleWebhook(Map<String, String> headers, String body);
    boolean isAvailable();
}
```

Everything above the interface is written against it:

| The class | What it does with the gateway |
|---|---|
| `BillingService` | The order state machine, the coupon rules, the subscription |
| `SubscriptionService` | The gate on the Pro features |
| `BillingController` | The candidate's orders and the plan catalogue |
| `AdminBillingController` | The administrator's approval of a manual order |

Nothing above the interface needs to change when a provider is added.

The two implementations that ship are `MockPaymentGateway` and
`ManualGateway`, plus `DisabledPaymentGateway` for when payments are
switched off.

## The steps

### 1. Add the SDK

```xml
<dependency>
    <groupId>com.razorpay</groupId>
    <artifactId>razorpay-java</artifactId>
    <version>1.4.6</version>
</dependency>
```

Check the current version before pinning it. The SDK is not needed for the
provider-neutral shape — only for talking to the provider.

### 2. Write the gateway

A new class, `RazorpayPaymentGateway`, implementing `PaymentGateway`:

```java
@Component
@ConditionalOnProperty(name = "app.payments.mode", havingValue = "razorpay")
public class RazorpayPaymentGateway implements PaymentGateway {

    @Override
    public String providerName() {
        return "RAZORPAY";
    }

    @Override
    public CreateOrderResult createOrder(CreateOrderRequest request) {
        // Create the order with the provider and return its reference.
    }

    @Override
    public PaymentVerification verifyPayment(Map<String, Object> payload) {
        // Check the signature, then fetch the payment and confirm it.
    }

    @Override
    public WebhookResult handleWebhook(Map<String, String> headers, String body) {
        // Check the signature, then read the event.
    }

    @Override
    public boolean isAvailable() {
        return true;
    }
}
```

**The signature check is not optional.** The `verifyPayment` and
`handleWebhook` methods must verify the provider's signature before they
believe anything in the payload. A webhook that is not checked is a webhook
that anybody can send, and it is what activates a subscription.

The `RAZORPAY` name goes into the `provider` column of `orders` and
`payments`. The column is `VARCHAR(30)`, so the name has to fit.

### 3. Add the mode to the configuration

The `PaymentGateway` beans are selected by `app.payments.mode`, so a new
mode needs a new `@ConditionalOnProperty` and nothing else:

```java
@ConditionalOnProperty(name = "app.payments.mode", havingValue = "razorpay")
```

`DisabledPaymentGateway` uses `matchIfMissing = true`, so an unknown mode
falls back to the safe one — payments are refused rather than accidentally
taken.

### 4. Add the keys to the environment

```bash
PAYMENTS_MODE=razorpay
RAZORPAY_KEY_ID=rzp_live_...
RAZORPAY_KEY_SECRET=...
RAZORPAY_WEBHOOK_SECRET=...
```

Add them to `.env.example` with a comment saying they are not needed for
`mock` or `manual`. The keys must never be in the code, and they must
never reach the browser — the frontend never sees them, because the order
is created on the server.

### 5. Point the webhook at the application

The provider needs a URL to call:

```
POST https://your-host/api/v1/billing/webhook/razorpay
```

Add that endpoint to `BillingController` and hand the raw body and the
headers to `handleWebhook`. The body must be the **raw** body — a signature
is computed over the bytes, so a re-serialised JSON will not match.

The endpoint must be public in `SecurityConfig`, because the provider has
no session. The signature check is what makes it safe.

### 6. Add the checkout to the interface

`CreateOrderResult` has a `checkoutUrl` field for exactly this. When it is
set, the pricing page opens it instead of showing the test-payment button.
The frontend needs one new button and one new call.

### 7. Test it

The provider's own test mode is the first step. After that:

- Add an integration test that drives the flow with the provider's test
  keys, in the same style as `BillingFlowTest`.
- Check that the webhook activates a subscription exactly once, when the
  provider delivers the same event twice. `BillingService.activateOrder` is
  idempotent, so this should work — but it should be *tested*, because it
  is the property that matters most.
- Check that a webhook with a bad signature is refused and does not
  activate anything.

## What must not change

- **The order state machine.** The states are `CREATED`, `PENDING`,
  `AWAITING_REVIEW`, `PAID`, `FAILED`, `CANCELLED`, `EXPIRED`, `REJECTED`
  and `APPROVED`. A provider that needs a state of its own maps onto one
  of these.
- **The idempotency.** The activation looks the subscription up by its
  order before it makes one. A provider that delivers the same event twice
  must not give two subscriptions.
- **The money.** Every amount is in paise, as an integer. A provider that
  works in rupees must be converted at the boundary, and the conversion
  must be exact.
- **The subscription as the single authority.** Whether a candidate is Pro
  is answered by `SubscriptionService`, and it does not change.

## The order of the work

1. The gateway, with the signature check.
2. The webhook endpoint.
3. The configuration and the keys.
4. The checkout in the interface.
5. The tests, including the duplicate-event case.

The manual gateway stays in the build. It is a real workflow, it needs no
provider, and it is what the deployment uses until a provider is configured.
