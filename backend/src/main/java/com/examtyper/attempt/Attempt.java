package com.examtyper.attempt;

import com.examtyper.scoring.ErrorModel;
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
 * One typing attempt.
 *
 * <p>The exam rules are copied onto this row when the attempt starts, so that
 * editing an exam profile later never changes the score of a test that has
 * already been taken. The reference passage text is copied too, for the same
 * reason.
 */
@Entity
@Table(name = "attempts")
public class Attempt {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id")
    private Long userId;

    @Column(name = "exam_code", nullable = false, length = 60)
    private String examCode;

    @Column(name = "mock_test_id")
    private Long mockTestId;

    @Column(name = "passage_id")
    private Long passageId;

    @Column(nullable = false, length = 20)
    private String language;

    @Column(name = "keyboard_layout", nullable = false, length = 40)
    private String keyboardLayout;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private AttemptStatus status = AttemptStatus.IN_PROGRESS;

    @Column(name = "duration_seconds", nullable = false)
    private int durationSeconds;

    @Column(name = "word_length_chars", nullable = false)
    private int wordLengthChars = 5;

    @Enumerated(EnumType.STRING)
    @Column(name = "error_model", nullable = false, length = 40)
    private ErrorModel errorModel = ErrorModel.FULL_AND_HALF_MISTAKES;

    @Column(name = "error_penalty_per_unit", nullable = false, precision = 6, scale = 3)
    private BigDecimal errorPenaltyPerUnit = BigDecimal.ONE;

    @Column(name = "passing_net_wpm", nullable = false, precision = 6, scale = 2)
    private BigDecimal passingNetWpm = BigDecimal.ZERO;

    /**
     * The accuracy floor the exam required, snapshotted at start time.
     *
     * <p>It has to be on the attempt rather than looked up from the profile at
     * scoring time, for the same reason the rest of the rules are: a later
     * change to the profile must not change how a stored result reads.
     */
    @Column(name = "min_accuracy_pct", nullable = false, precision = 5, scale = 2)
    private BigDecimal minAccuracyPct = BigDecimal.ZERO;

    @Column(name = "backspace_allowed", nullable = false)
    private boolean backspaceAllowed = true;

    @Column(name = "show_live_wpm", nullable = false)
    private boolean showLiveWpm = true;

    @Column(name = "reference_text", nullable = false, columnDefinition = "TEXT")
    private String referenceText;

    @Column(name = "typed_text", columnDefinition = "TEXT")
    private String typedText;

    @Column(name = "started_at", nullable = false)
    private Instant startedAt = Instant.now();

    @Column(name = "submitted_at")
    private Instant submittedAt;

    @Column(name = "duration_ms")
    private Long durationMs;

    @Column(name = "keystroke_count", nullable = false)
    private int keystrokeCount = 0;

    @Column(name = "backspace_count", nullable = false)
    private int backspaceCount = 0;

    @Column(name = "blur_count", nullable = false)
    private int blurCount = 0;

    @Column(name = "cheat_flags", columnDefinition = "TEXT")
    private String cheatFlags;

    @Column(name = "gross_wpm", precision = 8, scale = 2)
    private BigDecimal grossWpm;

    @Column(name = "net_wpm", precision = 8, scale = 2)
    private BigDecimal netWpm;

    @Column(name = "accuracy_pct", precision = 6, scale = 2)
    private BigDecimal accuracyPct;

    @Column(name = "full_mistakes")
    private Integer fullMistakes;

    @Column(name = "half_mistakes")
    private Integer halfMistakes;

    @Column(name = "passed")
    private Boolean passed;

    @Column(name = "score_json", columnDefinition = "TEXT")
    private String scoreJson;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        this.createdAt = now;
        this.updatedAt = now;
        if (startedAt == null) {
            startedAt = now;
        }
    }

    @PreUpdate
    void onUpdate() {
        this.updatedAt = Instant.now();
    }

    public boolean isInProgress() {
        return status == AttemptStatus.IN_PROGRESS;
    }

    /** The wall-clock deadline for this attempt. */
    public Instant deadline() {
        return startedAt.plusSeconds(durationSeconds);
    }

    public boolean isExpired(Instant now) {
        return now.isAfter(deadline());
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

    public String getExamCode() {
        return examCode;
    }

    public void setExamCode(String examCode) {
        this.examCode = examCode;
    }

    public Long getMockTestId() {
        return mockTestId;
    }

    public void setMockTestId(Long mockTestId) {
        this.mockTestId = mockTestId;
    }

    public Long getPassageId() {
        return passageId;
    }

    public void setPassageId(Long passageId) {
        this.passageId = passageId;
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

    public AttemptStatus getStatus() {
        return status;
    }

    public void setStatus(AttemptStatus status) {
        this.status = status;
    }

    public int getDurationSeconds() {
        return durationSeconds;
    }

    public void setDurationSeconds(int durationSeconds) {
        this.durationSeconds = durationSeconds;
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

    public BigDecimal getPassingNetWpm() {
        return passingNetWpm;
    }

    public void setPassingNetWpm(BigDecimal passingNetWpm) {
        this.passingNetWpm = passingNetWpm;
    }

    public BigDecimal getMinAccuracyPct() {
        return minAccuracyPct;
    }

    public void setMinAccuracyPct(BigDecimal minAccuracyPct) {
        this.minAccuracyPct = minAccuracyPct;
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

    public String getReferenceText() {
        return referenceText;
    }

    public void setReferenceText(String referenceText) {
        this.referenceText = referenceText;
    }

    public String getTypedText() {
        return typedText;
    }

    public void setTypedText(String typedText) {
        this.typedText = typedText;
    }

    public Instant getStartedAt() {
        return startedAt;
    }

    public void setStartedAt(Instant startedAt) {
        this.startedAt = startedAt;
    }

    public Instant getSubmittedAt() {
        return submittedAt;
    }

    public void setSubmittedAt(Instant submittedAt) {
        this.submittedAt = submittedAt;
    }

    public Long getDurationMs() {
        return durationMs;
    }

    public void setDurationMs(Long durationMs) {
        this.durationMs = durationMs;
    }

    public int getKeystrokeCount() {
        return keystrokeCount;
    }

    public void setKeystrokeCount(int keystrokeCount) {
        this.keystrokeCount = keystrokeCount;
    }

    public int getBackspaceCount() {
        return backspaceCount;
    }

    public void setBackspaceCount(int backspaceCount) {
        this.backspaceCount = backspaceCount;
    }

    public int getBlurCount() {
        return blurCount;
    }

    public void setBlurCount(int blurCount) {
        this.blurCount = blurCount;
    }

    public String getCheatFlags() {
        return cheatFlags;
    }

    public void setCheatFlags(String cheatFlags) {
        this.cheatFlags = cheatFlags;
    }

    public BigDecimal getGrossWpm() {
        return grossWpm;
    }

    public void setGrossWpm(BigDecimal grossWpm) {
        this.grossWpm = grossWpm;
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

    public Integer getFullMistakes() {
        return fullMistakes;
    }

    public void setFullMistakes(Integer fullMistakes) {
        this.fullMistakes = fullMistakes;
    }

    public Integer getHalfMistakes() {
        return halfMistakes;
    }

    public void setHalfMistakes(Integer halfMistakes) {
        this.halfMistakes = halfMistakes;
    }

    public Boolean getPassed() {
        return passed;
    }

    public void setPassed(Boolean passed) {
        this.passed = passed;
    }

    public String getScoreJson() {
        return scoreJson;
    }

    public void setScoreJson(String scoreJson) {
        this.scoreJson = scoreJson;
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
