package com.examtyper.user;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import java.time.Instant;

/**
 * A registered candidate.
 */
@Entity
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 190, unique = true)
    private String email;

    @Column(name = "password_hash", nullable = false, length = 120)
    private String passwordHash;

    @Column(name = "display_name", nullable = false, length = 80)
    private String displayName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Role role = Role.USER;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private UserStatus status = UserStatus.ACTIVE;

    @Column(name = "email_verified", nullable = false)
    private boolean emailVerified = false;

    @Column(name = "preferred_exam_code", length = 60)
    private String preferredExamCode;

    @Column(name = "preferred_language", length = 20)
    private String preferredLanguage;

    @Column(name = "target_wpm")
    private Integer targetWpm;

    @Column(name = "leaderboard_opt_out", nullable = false)
    private boolean leaderboardOptOut = false;

    @Column(name = "show_email_on_leaderboard", nullable = false)
    private boolean showEmailOnLeaderboard = false;

    @Column(name = "daily_free_limit", nullable = false)
    private int dailyFreeLimit = 3;

    @Column(nullable = false, length = 60)
    private String timezone = "Asia/Kolkata";

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    @Column(name = "last_login_at")
    private Instant lastLoginAt;

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

    public boolean isAdmin() {
        return role == Role.ADMIN;
    }

    public boolean isActive() {
        return status == UserStatus.ACTIVE;
    }

    // ---- accessors -------------------------------------------------------

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public void setPasswordHash(String passwordHash) {
        this.passwordHash = passwordHash;
    }

    public String getDisplayName() {
        return displayName;
    }

    public void setDisplayName(String displayName) {
        this.displayName = displayName;
    }

    public Role getRole() {
        return role;
    }

    public void setRole(Role role) {
        this.role = role;
    }

    public UserStatus getStatus() {
        return status;
    }

    public void setStatus(UserStatus status) {
        this.status = status;
    }

    public boolean isEmailVerified() {
        return emailVerified;
    }

    public void setEmailVerified(boolean emailVerified) {
        this.emailVerified = emailVerified;
    }

    public String getPreferredExamCode() {
        return preferredExamCode;
    }

    public void setPreferredExamCode(String preferredExamCode) {
        this.preferredExamCode = preferredExamCode;
    }

    public String getPreferredLanguage() {
        return preferredLanguage;
    }

    public void setPreferredLanguage(String preferredLanguage) {
        this.preferredLanguage = preferredLanguage;
    }

    public Integer getTargetWpm() {
        return targetWpm;
    }

    public void setTargetWpm(Integer targetWpm) {
        this.targetWpm = targetWpm;
    }

    public boolean isLeaderboardOptOut() {
        return leaderboardOptOut;
    }

    public void setLeaderboardOptOut(boolean leaderboardOptOut) {
        this.leaderboardOptOut = leaderboardOptOut;
    }

    public boolean isShowEmailOnLeaderboard() {
        return showEmailOnLeaderboard;
    }

    public void setShowEmailOnLeaderboard(boolean showEmailOnLeaderboard) {
        this.showEmailOnLeaderboard = showEmailOnLeaderboard;
    }

    public int getDailyFreeLimit() {
        return dailyFreeLimit;
    }

    public void setDailyFreeLimit(int dailyFreeLimit) {
        this.dailyFreeLimit = dailyFreeLimit;
    }

    public String getTimezone() {
        return timezone;
    }

    public void setTimezone(String timezone) {
        this.timezone = timezone;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }

    public Instant getLastLoginAt() {
        return lastLoginAt;
    }

    public void setLastLoginAt(Instant lastLoginAt) {
        this.lastLoginAt = lastLoginAt;
    }
}
