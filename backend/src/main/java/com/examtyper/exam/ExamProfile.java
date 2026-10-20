package com.examtyper.exam;

import com.examtyper.scoring.ErrorModel;
import com.examtyper.scoring.ScoringRules;
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

import java.math.BigDecimal;
import java.time.Instant;

/**
 * A data-driven description of one exam's typing rules.
 *
 * <p>Nothing about scoring is hardcoded: the duration, the word length, the
 * mistake model, the pass mark and the backspace policy all live here so that
 * they can be changed when an official notification changes them.
 */
@Entity
@Table(name = "exam_profiles")
public class ExamProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 60, unique = true)
    private String code;

    @Column(nullable = false, length = 160)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false, length = 20)
    private String language;

    @Column(name = "keyboard_layout", nullable = false, length = 40)
    private String keyboardLayout;

    @Column(name = "duration_seconds", nullable = false)
    private int durationSeconds;

    @Column(name = "target_keystrokes")
    private Integer targetKeystrokes;

    @Column(name = "target_words")
    private Integer targetWords;

    @Column(name = "passing_net_wpm", nullable = false, precision = 6, scale = 2)
    private BigDecimal passingNetWpm = BigDecimal.ZERO;

    @Column(name = "word_length_chars", nullable = false)
    private int wordLengthChars = 5;

    @Enumerated(EnumType.STRING)
    @Column(name = "error_model", nullable = false, length = 40)
    private ErrorModel errorModel = ErrorModel.FULL_AND_HALF_MISTAKES;

    @Column(name = "error_penalty_per_unit", nullable = false, precision = 6, scale = 3)
    private BigDecimal errorPenaltyPerUnit = BigDecimal.ONE;

    @Column(name = "backspace_allowed", nullable = false)
    private boolean backspaceAllowed = true;

    @Column(name = "show_live_wpm", nullable = false)
    private boolean showLiveWpm = true;

    @Column(name = "is_alphanumeric", nullable = false)
    private boolean alphanumeric;

    @Column(name = "min_accuracy_pct", nullable = false, precision = 5, scale = 2)
    private BigDecimal minAccuracyPct = BigDecimal.ZERO;

    @Column(name = "source_note", columnDefinition = "TEXT")
    private String sourceNote;

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

    /**
     * Snapshots these rules for an attempt, so later edits to the profile do not
     * change the score of a test that has already been taken.
     */
    public ScoringRules toScoringRules() {
        return new ScoringRules(
                durationSeconds,
                wordLengthChars,
                errorModel,
                errorPenaltyPerUnit == null ? 1.0d : errorPenaltyPerUnit.doubleValue(),
                passingNetWpm == null ? 0.0d : passingNetWpm.doubleValue(),
                minAccuracyPct == null ? 0.0d : minAccuracyPct.doubleValue(),
                backspaceAllowed);
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

    public String getLanguage() {
        return language;
    }

    public void setLanguage(String language) {
        this.language = language;
    }

    public String getKeyboardLayout() {
        return keyboardLayout;
    }

    public void setKeyboardLayout(String keyboardLayout) {
        this.keyboardLayout = keyboardLayout;
    }

    public int getDurationSeconds() {
        return durationSeconds;
    }

    public void setDurationSeconds(int durationSeconds) {
        this.durationSeconds = durationSeconds;
    }

    public Integer getTargetKeystrokes() {
        return targetKeystrokes;
    }

    public void setTargetKeystrokes(Integer targetKeystrokes) {
        this.targetKeystrokes = targetKeystrokes;
    }

    public Integer getTargetWords() {
        return targetWords;
    }

    public void setTargetWords(Integer targetWords) {
        this.targetWords = targetWords;
    }

    public BigDecimal getPassingNetWpm() {
        return passingNetWpm;
    }

    public void setPassingNetWpm(BigDecimal passingNetWpm) {
        this.passingNetWpm = passingNetWpm;
    }

    public int getWordLengthChars() {
        return wordLengthChars;
    }

    public void setWordLengthChars(int wordLengthChars) {
        this.wordLengthChars = wordLengthChars;
    }

    public ErrorModel getErrorModel() {
        return errorModel;
    }

    public void setErrorModel(ErrorModel errorModel) {
        this.errorModel = errorModel;
    }

    public BigDecimal getErrorPenaltyPerUnit() {
        return errorPenaltyPerUnit;
    }

    public void setErrorPenaltyPerUnit(BigDecimal errorPenaltyPerUnit) {
        this.errorPenaltyPerUnit = errorPenaltyPerUnit;
    }

    public boolean isBackspaceAllowed() {
        return backspaceAllowed;
    }

    public void setBackspaceAllowed(boolean backspaceAllowed) {
        this.backspaceAllowed = backspaceAllowed;
    }

    public boolean isShowLiveWpm() {
        return showLiveWpm;
    }

    public void setShowLiveWpm(boolean showLiveWpm) {
        this.showLiveWpm = showLiveWpm;
    }

    public boolean isAlphanumeric() {
        return alphanumeric;
    }

    public void setAlphanumeric(boolean alphanumeric) {
        this.alphanumeric = alphanumeric;
    }

    public BigDecimal getMinAccuracyPct() {
        return minAccuracyPct;
    }

    public void setMinAccuracyPct(BigDecimal minAccuracyPct) {
        this.minAccuracyPct = minAccuracyPct;
    }

    public String getSourceNote() {
        return sourceNote;
    }

    public void setSourceNote(String sourceNote) {
        this.sourceNote = sourceNote;
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

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }
}
