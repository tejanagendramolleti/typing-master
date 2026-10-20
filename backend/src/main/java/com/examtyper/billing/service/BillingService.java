package com.examtyper.billing.service;

import com.examtyper.billing.PaymentGateway;
import com.examtyper.billing.dto.CreateOrderRequest;
import com.examtyper.billing.dto.CreateOrderResult;
import com.examtyper.billing.dto.PaymentVerification;
import com.examtyper.billing.entity.Coupon;
import com.examtyper.billing.entity.CouponRedemption;
import com.examtyper.billing.entity.Invoice;
import com.examtyper.billing.entity.Order;
import com.examtyper.billing.entity.Payment;
import com.examtyper.billing.entity.Plan;
import com.examtyper.billing.entity.Subscription;
import com.examtyper.billing.repository.CouponRedemptionRepository;
import com.examtyper.billing.repository.CouponRepository;
import com.examtyper.billing.repository.InvoiceRepository;
import com.examtyper.billing.repository.OrderRepository;
import com.examtyper.billing.repository.PaymentRepository;
import com.examtyper.billing.repository.PlanRepository;
import com.examtyper.billing.repository.SubscriptionRepository;
import com.examtyper.common.error.BusinessException;
import com.examtyper.common.error.ConflictException;
import com.examtyper.common.error.ErrorCode;
import com.examtyper.common.error.NotFoundException;
import com.examtyper.user.User;
import com.examtyper.user.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;

/**
 * The billing service.
 *
 * <p>It owns the order state machine and the subscription that goes with
 * it. Everything here is written against the {@link PaymentGateway}
 * interface, so a real provider can be plugged in without changing a line
 * of this class.
 *
 * <p>The activation is idempotent. An order activates a subscription at most
 * once, because the subscription is looked up by its order before a new one
 * is made. Pressing the approve button twice therefore gives the candidate
 * one subscription, not two.
 */
@Service
public class BillingService {

    private static final Logger log = LoggerFactory.getLogger(BillingService.class);

    private final PlanRepository planRepository;
    private final OrderRepository orderRepository;
    private final PaymentRepository paymentRepository;
    private final SubscriptionRepository subscriptionRepository;
    private final CouponRepository couponRepository;
    private final CouponRedemptionRepository couponRedemptionRepository;
    private final InvoiceRepository invoiceRepository;
    private final UserRepository userRepository;
    private final PaymentGateway gateway;

    public BillingService(PlanRepository planRepository,
                          OrderRepository orderRepository,
                          PaymentRepository paymentRepository,
                          SubscriptionRepository subscriptionRepository,
                          CouponRepository couponRepository,
                          CouponRedemptionRepository couponRedemptionRepository,
                          InvoiceRepository invoiceRepository,
                          UserRepository userRepository,
                          PaymentGateway gateway) {
        this.planRepository = planRepository;
        this.orderRepository = orderRepository;
        this.paymentRepository = paymentRepository;
        this.subscriptionRepository = subscriptionRepository;
        this.couponRepository = couponRepository;
        this.couponRedemptionRepository = couponRedemptionRepository;
        this.invoiceRepository = invoiceRepository;
        this.userRepository = userRepository;
        this.gateway = gateway;
    }

    // ---- The catalogue ---------------------------------------------------

    /**
     * The plans on offer.
     */
    @Transactional(readOnly = true)
    public List<Plan> listPlans() {
        return planRepository.findByActiveTrueOrderBySortOrderAsc();
    }

    /**
     * One plan, by its code.
     */
    @Transactional(readOnly = true)
    public Plan findPlan(String code) {
        return planRepository.findByCode(code)
                .orElseThrow(() -> new NotFoundException("No such plan: " + code));
    }

    /**
     * The candidate's orders, newest first.
     */
    @Transactional(readOnly = true)
    public List<Order> listOrders(Long userId) {
        return orderRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    /**
     * One of the candidate's orders.
     */
    @Transactional(readOnly = true)
    public Order findOrder(Long userId, Long orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new NotFoundException("No such order."));
        if (!order.getUserId().equals(userId)) {
            throw new com.examtyper.common.error.AccessDeniedException(
                    "That order belongs to someone else.");
        }
        return order;
    }

    /**
     * Every order, for the administrator's list.
     */
    @Transactional(readOnly = true)
    public org.springframework.data.domain.Page<Order> listAllOrders(
            org.springframework.data.domain.Pageable pageable) {
        return orderRepository.findAll(pageable);
    }

    /**
     * The orders in one state, for the administrator's list.
     */
    @Transactional(readOnly = true)
    public org.springframework.data.domain.Page<Order> listOrdersByStatus(
            String status, org.springframework.data.domain.Pageable pageable) {
        return orderRepository.findByStatusOrderByCreatedAtDesc(status, pageable);
    }

    // ---- Creating an order ------------------------------------------------

    /**
     * Creates an order for a plan.
     *
     * @param userId     the buyer
     * @param planCode   the plan being bought
     * @param couponCode the coupon code, when one was given
     */
    @Transactional
    public Order createOrder(Long userId, String planCode, String couponCode, String idempotencyKey) {
        Plan plan = findPlan(planCode);
        if (!plan.isActive()) {
            throw new BusinessException(ErrorCode.VALIDATION_FAILED, "That plan is not available.");
        }
        if (plan.isFree()) {
            throw new BusinessException(ErrorCode.VALIDATION_FAILED,
                    "The free plan does not need an order.");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("No such user."));

        // An idempotency key means the same request twice gives the same
        // order, which matters when a candidate clicks the button twice on
        // a slow connection.
        if (idempotencyKey != null && !idempotencyKey.isBlank()) {
            Optional<Order> existing = orderRepository.findByIdempotencyKey(idempotencyKey);
            if (existing.isPresent()) {
                return existing.get();
            }
        }

        Coupon coupon = null;
        int discount = 0;
        if (couponCode != null && !couponCode.isBlank()) {
            coupon = validateCoupon(couponCode, plan.getPricePaise(), userId);
            discount = coupon.discountOn(plan.getPricePaise());
        }

        Order order = new Order();
        order.setOrderNumber(newOrderNumber());
        order.setUserId(userId);
        order.setPlanId(plan.getId());
        order.setProvider(gateway.providerName());
        order.setAmountPaise(plan.getPricePaise());
        order.setDiscountPaise(discount);
        order.setTotalPaise(Math.max(0, plan.getPricePaise() - discount));
        order.setCurrency(plan.getCurrency());
        order.setCouponId(coupon == null ? null : coupon.getId());
        order.setStatus("CREATED");
        order.setIdempotencyKey(idempotencyKey == null || idempotencyKey.isBlank()
                ? null : idempotencyKey);
        // An order that is not paid within a day is expired, so the table
        // does not fill up with abandoned carts.
        order.setExpiresAt(Instant.now().plus(24, ChronoUnit.HOURS));

        order = orderRepository.save(order);

        CreateOrderResult result = gateway.createOrder(new CreateOrderRequest(
                order.getId(),
                order.getOrderNumber(),
                plan.getCode(),
                plan.getName(),
                order.getAmountPaise(),
                order.getDiscountPaise(),
                order.getCurrency(),
                userId,
                user.getEmail(),
                coupon == null ? null : coupon.getCode()));

        order.setProviderRef(result.providerRef());
        order.setStatus(result.status());
        return orderRepository.save(order);
    }

    /**
     * Checks a coupon and works out the discount.
     */
    @Transactional(readOnly = true)
    public Coupon validateCoupon(String couponCode, int amountPaise, Long userId) {
        Coupon coupon = couponRepository.findByCode(couponCode.trim().toUpperCase(Locale.ROOT))
                .orElseThrow(() -> new BusinessException(ErrorCode.VALIDATION_FAILED,
                        "That coupon code is not valid."));

        Instant now = Instant.now();
        if (!coupon.isUsableAt(now)) {
            throw new BusinessException(ErrorCode.VALIDATION_FAILED,
                    "That coupon is not valid at the moment.");
        }
        if (amountPaise < coupon.getMinOrderPaise()) {
            throw new BusinessException(ErrorCode.VALIDATION_FAILED,
                    "That coupon needs a larger order.");
        }
        if (coupon.getMaxRedemptions() != null
                && couponRedemptionRepository.countByCouponId(coupon.getId()) >= coupon.getMaxRedemptions()) {
            throw new BusinessException(ErrorCode.VALIDATION_FAILED,
                    "That coupon has been used up.");
        }
        if (couponRedemptionRepository.countForUser(coupon.getId(), userId)
                >= coupon.getMaxRedemptionsPerUser()) {
            throw new BusinessException(ErrorCode.VALIDATION_FAILED,
                    "You have already used that coupon.");
        }
        return coupon;
    }

    // ---- Paying for an order ----------------------------------------------

    /**
     * Marks an order as paid and activates the subscription.
     *
     * <p>The activation is idempotent: an order that already has a
     * subscription is not given a second one, however many times this is
     * called.
     */
    @Transactional
    public Subscription activateOrder(Long orderId, String providerRef, Long adminUserId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new NotFoundException("No such order."));

        if (order.isPaid()) {
            // Already paid. The subscription is returned rather than a
            // second one being made.
            return subscriptionRepository.findByOrderId(order.getId())
                    .orElseThrow(() -> new ConflictException("The order is marked as paid but has no subscription."));
        }

        Plan plan = planRepository.findById(order.getPlanId())
                .orElseThrow(() -> new NotFoundException("No such plan."));

        Instant now = Instant.now();

        // A subscription that already exists for this order is reused. This
        // is the check that makes the activation idempotent.
        Optional<Subscription> existing = subscriptionRepository.findByOrderId(order.getId());
        if (existing.isPresent()) {
            order.setStatus("PAID");
            order.setProviderRef(providerRef == null ? order.getProviderRef() : providerRef);
            orderRepository.save(order);
            return existing.get();
        }

        Subscription subscription = new Subscription();
        subscription.setUserId(order.getUserId());
        subscription.setPlanId(plan.getId());
        subscription.setOrderId(order.getId());
        subscription.setProvider(order.getProvider());
        subscription.setProviderRef(providerRef == null ? order.getProviderRef() : providerRef);
        subscription.setStatus("ACTIVE");
        subscription.setStartsAt(now);
        // The subscription runs from the end of the one the candidate
        // already has, so buying again extends rather than replaces it.
        Instant currentEnd = subscriptionRepository
                .findActiveSubscription(order.getUserId(), now)
                .map(Subscription::getExpiresAt)
                .orElse(now);
        subscription.setExpiresAt(currentEnd.plus(plan.getDurationDays(), ChronoUnit.DAYS));
        subscription = subscriptionRepository.save(subscription);

        order.setStatus("PAID");
        order.setProviderRef(providerRef == null ? order.getProviderRef() : providerRef);
        if (adminUserId != null) {
            order.setReviewedBy(adminUserId);
            order.setReviewedAt(now);
        }
        orderRepository.save(order);

        // The payment is recorded, if it has not been already.
        if (providerRef != null && !providerRef.isBlank()) {
            recordPayment(order, providerRef, order.getTotalPaise(), "PAID", null);
        }

        // The coupon is redeemed, if one was used.
        if (order.getCouponId() != null) {
            CouponRedemption redemption = new CouponRedemption();
            redemption.setCouponId(order.getCouponId());
            redemption.setUserId(order.getUserId());
            redemption.setOrderId(order.getId());
            redemption.setAmountPaise(order.getDiscountPaise());
            couponRedemptionRepository.save(redemption);
        }

        // The invoice is written, if it has not been already.
        writeInvoice(order, plan, subscription);

        log.info("Order {} activated for user {} until {}", order.getOrderNumber(),
                order.getUserId(), subscription.getExpiresAt());
        return subscription;
    }

    /**
     * The mock gateway's "Pay (test)" path.
     */
    @Transactional
    public Subscription payMockOrder(Long orderId, Long userId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new NotFoundException("No such order."));

        if (!order.getUserId().equals(userId)) {
            throw new com.examtyper.common.error.AccessDeniedException("That order belongs to someone else.");
        }
        if (!gateway.isAvailable()) {
            throw new BusinessException(ErrorCode.VALIDATION_FAILED,
                    "Test payments are not available here.");
        }
        if (order.isPaid()) {
            return subscriptionRepository.findByOrderId(order.getId())
                    .orElseThrow(() -> new ConflictException("The order is already paid."));
        }
        if (!order.isOpen()) {
            throw new BusinessException(ErrorCode.VALIDATION_FAILED,
                    "That order can no longer be paid.");
        }

        return activateOrder(order.getId(), order.getProviderRef(), null);
    }

    /**
     * The manual gateway's approval path, used by an administrator.
     */
    @Transactional
    public Subscription approveManualOrder(Long orderId, Long adminUserId, String note) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new NotFoundException("No such order."));

        if (!"MANUAL".equals(order.getProvider())) {
            throw new BusinessException(ErrorCode.VALIDATION_FAILED,
                    "That order was not made with the manual method.");
        }
        if (order.isPaid()) {
            // Approving twice must not give a second subscription.
            return subscriptionRepository.findByOrderId(order.getId())
                    .orElseThrow(() -> new ConflictException("The order is already paid."));
        }

        order.setAdminNote(note);
        order.setReviewedBy(adminUserId);
        order.setReviewedAt(Instant.now());
        order.setStatus("APPROVED");
        orderRepository.save(order);

        return activateOrder(order.getId(), order.getManualRef(), adminUserId);
    }

    /**
     * Rejects a manual order.
     */
    @Transactional
    public Order rejectManualOrder(Long orderId, Long adminUserId, String note) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new NotFoundException("No such order."));

        if (order.isPaid()) {
            throw new ConflictException("That order has already been paid.");
        }

        order.setStatus("REJECTED");
        order.setAdminNote(note);
        order.setReviewedBy(adminUserId);
        order.setReviewedAt(Instant.now());
        return orderRepository.save(order);
    }

    /**
     * The candidate gives the UPI transaction reference for a manual order.
     */
    @Transactional
    public Order submitManualReference(Long orderId, Long userId, String manualRef, String note) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new NotFoundException("No such order."));

        if (!order.getUserId().equals(userId)) {
            throw new com.examtyper.common.error.AccessDeniedException("That order belongs to someone else.");
        }
        if (!"MANUAL".equals(order.getProvider())) {
            throw new BusinessException(ErrorCode.VALIDATION_FAILED,
                    "That order does not use the manual method.");
        }
        if (order.isPaid()) {
            throw new ConflictException("That order has already been paid.");
        }
        if (manualRef == null || manualRef.isBlank()) {
            throw new BusinessException(ErrorCode.VALIDATION_FAILED,
                    "The transaction reference is required.");
        }

        order.setManualRef(manualRef.trim());
        order.setManualNote(note);
        order.setStatus("AWAITING_REVIEW");
        return orderRepository.save(order);
    }

    // ---- The subscription -------------------------------------------------

    /**
     * The candidate's active subscription, if there is one.
     */
    @Transactional(readOnly = true)
    public Optional<Subscription> findActiveSubscription(Long userId) {
        return subscriptionRepository.findActiveSubscription(userId, Instant.now());
    }

    /**
     * True when the candidate has an active subscription.
     */
    @Transactional(readOnly = true)
    public boolean isPro(Long userId) {
        return subscriptionRepository
                .findActiveSubscription(userId, Instant.now())
                .isPresent();
    }

    // ---- The helper methods -----------------------------------------------

    private Payment recordPayment(Order order, String providerRef, int amountPaise,
                                   String status, String method) {
        Optional<Payment> existing = paymentRepository
                .findByProviderAndProviderRef(order.getProvider(), providerRef);
        if (existing.isPresent()) {
            return existing.get();
        }

        Payment payment = new Payment();
        payment.setOrderId(order.getId());
        payment.setUserId(order.getUserId());
        payment.setProvider(order.getProvider());
        payment.setProviderRef(providerRef);
        payment.setAmountPaise(amountPaise);
        payment.setCurrency(order.getCurrency());
        payment.setStatus(status);
        payment.setMethod(method);
        return paymentRepository.save(payment);
    }

    private void writeInvoice(Order order, Plan plan, Subscription subscription) {
        if (order.getId() == null) {
            return;
        }
        boolean alreadyWritten = invoiceRepository.findByOrderId(order.getId()).isPresent();
        if (alreadyWritten) {
            return;
        }

        Invoice invoice = new Invoice();
        invoice.setNumber("INV-" + UUID.randomUUID().toString().replace("-", "").substring(0, 16)
                .toUpperCase(Locale.ROOT));
        invoice.setUserId(order.getUserId());
        invoice.setOrderId(order.getId());
        invoice.setSubscriptionId(subscription.getId());
        invoice.setPlanId(plan.getId());
        invoice.setAmountPaise(order.getAmountPaise());
        invoice.setDiscountPaise(order.getDiscountPaise());
        invoice.setTotalPaise(order.getTotalPaise());
        invoice.setTaxPaise(0);
        invoice.setCurrency(order.getCurrency());
        invoice.setStatus("PAID");
        invoiceRepository.save(invoice);
    }

    /**
     * A new order number, readable by a person.
     */
    private String newOrderNumber() {
        return "ET" + Instant.now().toEpochMilli()
                + UUID.randomUUID().toString().replace("-", "").substring(0, 6).toUpperCase(Locale.ROOT);
    }
}
