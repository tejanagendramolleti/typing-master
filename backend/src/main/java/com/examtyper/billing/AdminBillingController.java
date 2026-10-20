package com.examtyper.billing;

import com.examtyper.billing.dto.AdminOrderResponse;
import com.examtyper.billing.dto.ApproveOrderRequest;
import com.examtyper.billing.dto.OrderResponse;
import com.examtyper.billing.dto.SubscriptionResponse;
import com.examtyper.billing.entity.Order;
import com.examtyper.billing.entity.Subscription;
import com.examtyper.billing.service.BillingService;
import com.examtyper.common.web.CurrentUser;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
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
 * The administrator's billing endpoints.
 *
 * <p>The manual gateway needs somebody to approve the payments, and this
 * is where that happens. The approval is idempotent: approving an order
 * twice gives one subscription, not two.
 */
@RestController
@RequestMapping("/api/v1/admin")
@Tag(name = "Administration", description = "Managing the content, the users and the billing")
public class AdminBillingController {

    private final BillingService billingService;

    public AdminBillingController(BillingService billingService) {
        this.billingService = billingService;
    }

    @GetMapping("/orders")
    @Operation(summary = "The orders, newest first")
    public ResponseEntity<Page<AdminOrderResponse>> orders(
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {

        PageRequest pageable = PageRequest.of(
                Math.max(0, page),
                Math.min(200, Math.max(1, size)),
                Sort.by(Sort.Direction.DESC, "createdAt"));

        Page<Order> orders = status == null || status.isBlank()
                ? billingService.listAllOrders(pageable)
                : billingService.listOrdersByStatus(status, pageable);

        return ResponseEntity.ok(orders.map(AdminOrderResponse::from));
    }

    @PostMapping("/orders/{orderId}/approve")
    @Operation(summary = "Approve a manual order and activate the subscription")
    public ResponseEntity<SubscriptionResponse> approve(
            @PathVariable Long orderId,
            @Valid @RequestBody ApproveOrderRequest request) {

        Subscription subscription = billingService.approveManualOrder(
                orderId, CurrentUser.requireId(), request.note());
        return ResponseEntity.ok(SubscriptionResponse.from(subscription));
    }

    @PostMapping("/orders/{orderId}/reject")
    @Operation(summary = "Reject a manual order")
    public ResponseEntity<OrderResponse> reject(
            @PathVariable Long orderId,
            @Valid @RequestBody ApproveOrderRequest request) {

        Order order = billingService.rejectManualOrder(orderId, CurrentUser.requireId(), request.note());
        return ResponseEntity.ok(OrderResponse.from(order));
    }
}
