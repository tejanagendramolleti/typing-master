package com.examtyper.attempt;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import java.time.Instant;

/**
 * A single recorded event during an attempt.
 *
 * <p>Keystroke and backspace events give the server the timing data it needs to
 * recompute the score without trusting the client. The other types are
 * anti-cheat signals such as a paste attempt or the window losing focus.
 */
@Entity
@Table(name = "attempt_events")
public class AttemptEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "attempt_id", nullable = false)
    private Long attemptId;

    @Enumerated(EnumType.STRING)
    @Column(name = "event_type", nullable = false, length = 30)
    private AttemptEventType eventType;

    @Column(name = "char_index")
    private Integer charIndex;

    @Column(name = "char_value", length = 8)
    private String charValue;

    @Column(name = "key_code", length = 20)
    private String keyCode;

    @Column(name = "offset_ms")
    private Long offsetMs;

    @Column(name = "event_at", nullable = false)
    private Instant eventAt;

    @Column(columnDefinition = "TEXT")
    private String payload;

    @PrePersist
    void onCreate() {
        if (eventAt == null) {
            eventAt = Instant.now();
        }
    }

    // ---- accessors -------------------------------------------------------

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getAttemptId() {
        return attemptId;
    }

    public void setAttemptId(Long attemptId) {
        this.attemptId = attemptId;
    }

    public AttemptEventType getEventType() {
        return eventType;
    }

    public void setEventType(AttemptEventType eventType) {
        this.eventType = eventType;
    }

    public Integer getCharIndex() {
        return charIndex;
    }

    public void setCharIndex(Integer charIndex) {
        this.charIndex = charIndex;
    }

    public String getCharValue() {
        return charValue;
    }

    public void setCharValue(String charValue) {
        this.charValue = charValue;
    }

    public String getKeyCode() {
        return keyCode;
    }

    public void setKeyCode(String keyCode) {
        this.keyCode = keyCode;
    }

    public Long getOffsetMs() {
        return offsetMs;
    }

    public void setOffsetMs(Long offsetMs) {
        this.offsetMs = offsetMs;
    }

    public Instant getEventAt() {
        return eventAt;
    }

    public void setEventAt(Instant eventAt) {
        this.eventAt = eventAt;
    }

    public String getPayload() {
        return payload;
    }

    public void setPayload(String payload) {
        this.payload = payload;
    }
}
