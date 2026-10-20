package com.examtyper.billing.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import java.time.Instant;

/**
 * An order: a candidate's intent to buy a plan.
 *
 * <p>The order is the state machine. It starts as {@code CREATED}, moves to
 * {@code PENDING} or {@code AWAITING_REVIEW} when the candidate is asked
 * to pay, and ends as {@code PAID}, {@code REJECTED}, {@code FAILED} or
 * {@code CANCELLED}. A paid order is what activates a subscription, and
 * that activation is idempotent — see {@code DECISIONS.md} D11.
 */
@Entity
@Table(name = "orders")
public class Order {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "order_number", nullable = false, length = 40, unique = true)
    private String orderNumber;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "plan_id", nullable = false)
    private Long planId;

    /** MOCK, MANUAL, or a real provider's name. */
    @Column(nullable = false, length = 30)
    private String provider;

    @Column(name = "provider_ref", length = 120)
    private String providerRef;

    @Column(name = "amount_paise", nullable = false)
    private int amountPaise;

    @Column(name = "discount_paise", nullable = false)
    private int discountPaise = 0;

    @Column(name = "total_paise", nullable = false)
    private int totalPaise;

    @Column(nullable = false, length = 8)
    private String currency = "INR";

    @Column(name = "coupon_id")
    private Long couponId;

    @Column(nullable = false, length = 30)
    private String status = "CREATED";

    /** The UPI transaction reference the candidate gave. */
    @Column(name = "manual_ref", length = 120)
    private String manualRef;

    @Column(name = "manual_note", length = 500)
    private String manualNote;

    @Column(name = "admin_note", length = 500)
    private String adminNote;

    @Column(name = "reviewed_by")
    private Long reviewedBy;

    @Column(name = "reviewed_at")
    private Instant reviewedAt;

    @Column(name = "idempotency_key", length = 80, unique = true)
    private String idempotencyKey;

    @Column(name = "expires_at")
    private Instant expiresAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        this.createdAt = now;
        this.updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        this.updatedAt = Instant.now();
    }

    /** True when the order has been paid and can activate a subscription. */
    public boolean isPaid() {
        return "PAID".equals(status) || "APPROVED".equals(status);
    }

    /** True when the order can still be paid. */
    public boolean isOpen() {
        return "CREATED".equals(status) || "PENDING".equals(status)
                || "AWAITING_REVIEW".equals(status);
    }

    // ---- accessors -------------------------------------------------------

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getOrderNumber() {
        return orderNumber;
    }

    public void setOrderNumber(String orderNumber) {
        this.orderNumber = orderNumber;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public Long getPlanId() {
        return planId;
    }

    public void setPlanId(Long planId) {
        this.planId = planId;
    }

    public String getProvider() {
        return provider;
    }

    public void setProvider(String provider) {
        this.provider = provider;
    }

    public String getProviderRef() {
        return providerRef;
    }

    public void setProviderRef(String providerRef) {
        this.providerRef = providerRef;
    }

    public int getAmountPaise() {
        return amountPaise;
    }

    public void setAmountPaise(int amountPaise) {
        this.amountPaise = amountPaise;
    }

    public int getDiscountPaise() {
        return discountPaise;
    }

    public void setDiscountPaise(int discountPaise) {
        this.discountPaise = discountPaise;
    }

    public int getTotalPaise() {
        return totalPaise;
    }

    public void setTotalPaise(int totalPaise) {
        this.totalPaise = totalPaise;
    }

    public String getCurrency() {
        return currency;
    }

    public void setCurrency(String currency) {
        this.currency = currency;
    }

    public Long getCouponId() {
        return couponId;
    }

    public void setCouponId(Long couponId) {
        this.couponId = couponId;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getManualRef() {
        return manualRef;
    }

    public void setManualRef(String manualRef) {
        this.manualRef = manualRef;
    }

    public String getManualNote() {
        return manualNote;
    }

    public void setManualNote(String manualNote) {
        this.manualNote = manualNote;
    }

    public String getAdminNote() {
        return adminNote;
    }

    public void setAdminNote(String adminNote) {
        this.adminNote = adminNote;
    }

    public Long getReviewedBy() {
        return reviewedBy;
    }

    public void setReviewedBy(Long reviewedBy) {
        this.reviewedBy = reviewedBy;
    }

    public Instant getReviewedAt() {
        return reviewedAt;
    }

    public void setReviewedAt(Instant reviewedAt) {
        this.reviewedAt = reviewedAt;
    }

    public String getIdempotencyKey() {
        return idempotencyKey;
    }

    public void setIdempotencyKey(String idempotencyKey) {
        this.idempotencyKey = idempotencyKey;
    }

    public Instant getExpiresAt() {
        return expiresAt;
    }

    public void setExpiresAt(Instant expiresAt) {
        this.expiresAt = expiresAt;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
