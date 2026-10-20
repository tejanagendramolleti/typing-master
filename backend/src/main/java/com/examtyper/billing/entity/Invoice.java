package com.examtyper.billing.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import java.time.Instant;

/**
 * An invoice: the record of what a candidate paid for.
 *
 * <p>Every amount is in paise, and the discount is kept beside the total
 * rather than folded into it, so the invoice shows what the candidate paid
 * and what was taken off.
 */
@Entity
@Table(name = "invoices")
public class Invoice {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 40, unique = true)
    private String number;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "order_id")
    private Long orderId;

    @Column(name = "subscription_id")
    private Long subscriptionId;

    @Column(name = "plan_id")
    private Long planId;

    @Column(name = "amount_paise", nullable = false)
    private int amountPaise;

    @Column(name = "discount_paise", nullable = false)
    private int discountPaise = 0;

    @Column(name = "total_paise", nullable = false)
    private int totalPaise;

    @Column(name = "tax_paise", nullable = false)
    private int taxPaise = 0;

    @Column(nullable = false, length = 8)
    private String currency = "INR";

    @Column(nullable = false, length = 20)
    private String status = "PAID";

    @Column(name = "issued_at", nullable = false)
    private Instant issuedAt = Instant.now();

    @PrePersist
    void onCreate() {
        this.issuedAt = Instant.now();
    }

    // ---- accessors -------------------------------------------------------

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getNumber() {
        return number;
    }

    public void setNumber(String number) {
        this.number = number;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public Long getOrderId() {
        return orderId;
    }

    public void setOrderId(Long orderId) {
        this.orderId = orderId;
    }

    public Long getSubscriptionId() {
        return subscriptionId;
    }

    public void setSubscriptionId(Long subscriptionId) {
        this.subscriptionId = subscriptionId;
    }

    public Long getPlanId() {
        return planId;
    }

    public void setPlanId(Long planId) {
        this.planId = planId;
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

    public int getTaxPaise() {
        return taxPaise;
    }

    public void setTaxPaise(int taxPaise) {
        this.taxPaise = taxPaise;
    }

    public String getCurrency() {
        return currency;
    }

    public void setCurrency(String currency) {
        this.currency = currency;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public Instant getIssuedAt() {
        return issuedAt;
    }
}
