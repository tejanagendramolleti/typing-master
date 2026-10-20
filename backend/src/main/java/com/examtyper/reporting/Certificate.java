package com.examtyper.reporting;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * A certificate: the record of a candidate passing a full-length mock.
 */
@Entity
@Table(name = "certificates")
public class Certificate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "attempt_id")
    private Long attemptId;

    @Column(name = "certificate_no", nullable = false, length = 40, unique = true)
    private String certificateNo;

    @Column(name = "display_name", nullable = false, length = 80)
    private String displayName;

    @Column(name = "exam_code", nullable = false, length = 60)
    private String examCode;

    @Column(name = "exam_name", nullable = false, length = 160)
    private String examName;

    @Column(name = "net_wpm", nullable = false, precision = 8, scale = 2)
    private BigDecimal netWpm = BigDecimal.ZERO;

    @Column(name = "accuracy_pct", nullable = false, precision = 6, scale = 2)
    private BigDecimal accuracyPct = BigDecimal.ZERO;

    @Column(name = "target_wpm", nullable = false, precision = 8, scale = 2)
    private BigDecimal targetWpm = BigDecimal.ZERO;

    @Column(nullable = false, length = 20)
    private String language;

    @Column(name = "issued_at", nullable = false)
    private Instant issuedAt = Instant.now();

    @Column(nullable = false)
    private boolean revoked = false;

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

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public Long getAttemptId() {
        return attemptId;
    }

    public void setAttemptId(Long attemptId) {
        this.attemptId = attemptId;
    }

    public String getCertificateNo() {
        return certificateNo;
    }

    public void setCertificateNo(String certificateNo) {
        this.certificateNo = certificateNo;
    }

    public String getDisplayName() {
        return displayName;
    }

    public void setDisplayName(String displayName) {
        this.displayName = displayName;
    }

    public String getExamCode() {
        return examCode;
    }

    public void setExamCode(String examCode) {
        this.examCode = examCode;
    }

    public String getExamName() {
        return examName;
    }

    public void setExamName(String examName) {
        this.examName = examName;
    }

    public BigDecimal getNetWpm() {
        return netWpm;
    }

    public void setNetWpm(BigDecimal netWpm) {
        this.netWpm = netWpm;
    }

    public BigDecimal getAccuracyPct() {
        return accuracyPct;
    }

    public void setAccuracyPct(BigDecimal accuracyPct) {
        this.accuracyPct = accuracyPct;
    }

    public BigDecimal getTargetWpm() {
        return targetWpm;
    }

    public void setTargetWpm(BigDecimal targetWpm) {
        this.targetWpm = targetWpm;
    }

    public String getLanguage() {
        return language;
    }

    public void setLanguage(String language) {
        this.language = language;
    }

    public Instant getIssuedAt() {
        return issuedAt;
    }

    public void setIssuedAt(Instant issuedAt) {
        this.issuedAt = issuedAt;
    }

    public boolean isRevoked() {
        return revoked;
    }

    public void setRevoked(boolean revoked) {
        this.revoked = revoked;
    }
}
