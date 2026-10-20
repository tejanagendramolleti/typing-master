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
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

/**
 * A pricing plan.
 *
 * <p>The price lives in the database rather than in the code, so it can be
 * changed without a deployment and so a discount can be applied to one
 * plan without touching the others.
 */
@Entity
@Table(name = "plans")
public class Plan {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 40, unique = true)
    private String code;

    @Column(nullable = false, length = 120)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    /** The price, in paise. Money is never held as a fraction. */
    @Column(name = "price_paise", nullable = false)
    private int pricePaise = 0;

    @Column(nullable = false, length = 8)
    private String currency = "INR";

    @Column(name = "duration_days", nullable = false)
    private int durationDays = 30;

    /** FREE, MONTHLY, QUARTERLY, YEARLY or LIFETIME. */
    @Column(nullable = false, length = 20)
    private String interval = "MONTHLY";

    /** The features, one per line. */
    @Column(columnDefinition = "TEXT")
    private String features;

    @Column(nullable = false)
    private boolean active = true;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder = 0;

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

    /** The features, as a list. */
    public List<String> featureList() {
        if (features == null || features.isBlank()) {
            return List.of();
        }
        return Arrays.stream(features.split("\n")).map(String::trim).filter(s -> !s.isEmpty()).toList();
    }

    public void setFeatures(List<String> values) {
        this.features = values == null ? null : String.join("\n", values);
    }

    /** True when this plan is the free one. */
    public boolean isFree() {
        return "FREE".equals(interval) || pricePaise == 0;
    }

    // ---- accessors -------------------------------------------------------

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public int getPricePaise() {
        return pricePaise;
    }

    public void setPricePaise(int pricePaise) {
        this.pricePaise = pricePaise;
    }

    public String getCurrency() {
        return currency;
    }

    public void setCurrency(String currency) {
        this.currency = currency;
    }

    public int getDurationDays() {
        return durationDays;
    }

    public void setDurationDays(int durationDays) {
        this.durationDays = durationDays;
    }

    public String getInterval() {
        return interval;
    }

    public void setInterval(String interval) {
        this.interval = interval;
    }

    public String getFeatures() {
        return features;
    }

    public void setFeatures(String features) {
        this.features = features;
    }

    public boolean isActive() {
        return active;
    }

    public void setActive(boolean active) {
        this.active = active;
    }

    public int getSortOrder() {
        return sortOrder;
    }

    public void setSortOrder(int sortOrder) {
        this.sortOrder = sortOrder;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    /** The features, as a mutable list, for the API response. */
    public List<String> features() {
        return new ArrayList<>(featureList());
    }
}
