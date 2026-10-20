package com.examtyper.billing;

import com.examtyper.billing.entity.Order;
import com.examtyper.billing.entity.Plan;
import com.examtyper.billing.entity.Subscription;
import com.examtyper.billing.dto.CouponPreview;
import com.examtyper.billing.dto.CreateOrderRequestDto;
import com.examtyper.billing.dto.ManualReferenceRequest;
import com.examtyper.billing.dto.OrderResponse;
import com.examtyper.billing.dto.PlanCatalogueResponse;
import com.examtyper.billing.dto.PlanResponse;
import com.examtyper.billing.dto.SubscriptionResponse;
import com.examtyper.billing.service.BillingService;
import com.examtyper.billing.service.SubscriptionService;
import com.examtyper.common.config.AppProperties;
import com.examtyper.common.error.BusinessException;
import com.examtyper.common.error.ErrorCode;
import com.examtyper.common.web.CurrentUser;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * The billing endpoints.
 *
 * <p>They are the candidate's side: the plans on offer, the orders they
 * have made, the subscription they have and the actions they can take on
 * an order.
 */
@RestController
@RequestMapping("/api/v1")
@Tag(name = "Billing", description = "Plans, orders and subscriptions")
public class BillingController {

    private final BillingService billingService;
    private final SubscriptionService subscriptionService;
    private final AppProperties appProperties;

    public BillingController(BillingService billingService,
                             SubscriptionService subscriptionService,
                             AppProperties appProperties) {
        this.billingService = billingService;
        this.subscriptionService = subscriptionService;
        this.appProperties = appProperties;
    }

    @GetMapping("/plans")
    @Operation(summary = "The plans on offer")
    public ResponseEntity<PlanCatalogueResponse> plans() {
        List<PlanResponse> plans = billingService.listPlans().stream()
                .map(PlanResponse::from)
                .toList();
        String mode = appProperties.getPayments().getMode();
        boolean enabled = !"disabled".equalsIgnoreCase(mode);
        return ResponseEntity.ok(new PlanCatalogueResponse(plans, enabled, mode));
    }

    @PostMapping("/billing/orders")
    @Operation(summary = "Start an order for a plan")
    public ResponseEntity<OrderResponse> createOrder(@Valid @RequestBody CreateOrderRequestDto request) {
        Order order = billingService.createOrder(
                CurrentUser.requireId(),
                request.planCode(),
                request.couponCode(),
                request.idempotencyKey());
        return ResponseEntity.status(201).body(OrderResponse.from(order));
    }

    @GetMapping("/billing/orders")
    @Operation(summary = "The candidate's orders")
    public ResponseEntity<List<OrderResponse>> orders() {
        List<OrderResponse> orders = billingService.listOrders(CurrentUser.requireId()).stream()
                .map(OrderResponse::from)
                .toList();
        return ResponseEntity.ok(orders);
    }

    @GetMapping("/billing/orders/{orderId}")
    @Operation(summary = "One of the candidate's orders")
    public ResponseEntity<OrderResponse> order(@PathVariable Long orderId) {
        Order order = billingService.findOrder(CurrentUser.requireId(), orderId);
        return ResponseEntity.ok(OrderResponse.from(order));
    }

    @PostMapping("/billing/orders/{orderId}/pay")
    @Operation(summary = "Pay for an order with the test gateway")
    public ResponseEntity<SubscriptionResponse> pay(@PathVariable Long orderId) {
        Subscription subscription = billingService.payMockOrder(orderId, CurrentUser.requireId());
        return ResponseEntity.ok(SubscriptionResponse.from(subscription));
    }

    @PostMapping("/billing/orders/{orderId}/manual-reference")
    @Operation(summary = "Give the UPI transaction reference for a manual order")
    public ResponseEntity<OrderResponse> manualReference(
            @PathVariable Long orderId,
            @Valid @RequestBody ManualReferenceRequest request) {
        Order order = billingService.submitManualReference(
                orderId, CurrentUser.requireId(), request.manualRef(), request.note());
        return ResponseEntity.ok(OrderResponse.from(order));
    }

    @GetMapping("/billing/subscription")
    @Operation(summary = "The candidate's subscription")
    public ResponseEntity<SubscriptionResponse> subscription() {
        return subscriptionService.findActive(CurrentUser.requireId())
                .map(subscription -> ResponseEntity.ok(SubscriptionResponse.from(subscription)))
                .orElseGet(() -> ResponseEntity.noContent().build());
    }

    @PostMapping("/billing/coupons/validate")
    @Operation(summary = "Check a coupon code and see the discount")
    public ResponseEntity<CouponPreview> validateCoupon(@RequestParam String code,
                                                         @RequestParam int amountPaise) {
        var coupon = billingService.validateCoupon(code, amountPaise, CurrentUser.requireId());
        int discount = coupon.discountOn(amountPaise);
        return ResponseEntity.ok(new CouponPreview(
                coupon.getCode(),
                coupon.getDescription(),
                discount,
                Math.max(0, amountPaise - discount)));
    }
}
