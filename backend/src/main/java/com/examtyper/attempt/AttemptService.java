package com.examtyper.attempt;

import com.examtyper.attempt.dto.AttemptResponse;
import com.examtyper.attempt.dto.AttemptResultResponse;
import com.examtyper.attempt.dto.QuotaStatusResponse;
import com.examtyper.attempt.dto.RecentResultResponse;
import com.examtyper.attempt.dto.StartAttemptRequest;
import com.examtyper.attempt.dto.SubmitAttemptRequest;
import com.examtyper.common.error.BusinessException;
import com.examtyper.common.error.ErrorCode;
import com.examtyper.common.error.NotFoundException;
import com.examtyper.exam.ExamProfile;
import com.examtyper.exam.ExamProfileService;
import com.examtyper.passage.Passage;
import com.examtyper.passage.PassageRepository;
import com.examtyper.scoring.ErrorType;
import com.examtyper.scoring.ScoreResult;
import com.examtyper.scoring.ScoringEngine;
import com.examtyper.user.User;
import com.examtyper.scoring.ScoringRules;
import com.examtyper.scoring.WordDiff;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.data.domain.PageRequest;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;

/**
 * The attempt lifecycle: start, submit, resume.
 *
 * <p><b>The server never trusts a client-computed score.</b> On submission the
 * typed text and the recorded timing events come back from the client, and
 * everything else — elapsed time, keystroke counts, WPM, accuracy, pass/fail —
 * is recomputed here from that raw data.
 */
@Service
public class AttemptService {

    private static final Logger log = LoggerFactory.getLogger(AttemptService.class);
    private static final int MAX_KEPT_EVENTS = 20_000;

    private final AttemptRepository attemptRepository;
    private final AttemptEventRepository eventRepository;
    private final ExamProfileService examProfileService;
    private final PassageRepository passageRepository;
    private final ScoringEngine scoringEngine;
    private final ObjectMapper objectMapper;
    private final com.examtyper.reporting.CertificateService certificateService;
    private final QuotaService quotaService;
    private final com.examtyper.user.UserRepository userRepository;

    public AttemptService(AttemptRepository attemptRepository,
                          AttemptEventRepository eventRepository,
                          ExamProfileService examProfileService,
                          PassageRepository passageRepository,
                          ScoringEngine scoringEngine,
                          ObjectMapper objectMapper,
                          QuotaService quotaService,
                          com.examtyper.user.UserRepository userRepository,
                          com.examtyper.reporting.CertificateService certificateService) {
        this.attemptRepository = attemptRepository;
        this.eventRepository = eventRepository;
        this.examProfileService = examProfileService;
        this.passageRepository = passageRepository;
        this.scoringEngine = scoringEngine;
        this.objectMapper = objectMapper;
        this.certificateService = certificateService;
        this.quotaService = quotaService;
        this.userRepository = userRepository;
    }

    // -----------------------------------------------------------------
    // Start
    // -----------------------------------------------------------------

    @Transactional
    public AttemptResponse start(Long userId, StartAttemptRequest request) {
        // The daily allowance is checked here, on the server, before any
        // passage is picked. The interface shows a prompt, but this is what
        // actually stops the fourth test.
        com.examtyper.user.User user = userRepository.findById(userId)
                .orElseThrow(() -> NotFoundException.of("User", userId));
        quotaService.requireQuota(user);

        ExamProfile profile = examProfileService.findByCode(request.examCode());

        Passage passage = request.passageId() != null
                ? passageRepository.findByIdAndActiveTrue(request.passageId())
                        .orElseThrow(() -> NotFoundException.of("Passage", request.passageId()))
                : pickPassage(profile, request.difficulty());

        Attempt attempt = new Attempt();
        attempt.setUserId(userId);
        attempt.setExamCode(profile.getCode());
        attempt.setPassageId(passage.getId());
        attempt.setLanguage(profile.getLanguage());
        attempt.setKeyboardLayout(profile.getKeyboardLayout());
        attempt.setStatus(AttemptStatus.IN_PROGRESS);
        attempt.setDurationSeconds(profile.getDurationSeconds());
        attempt.setWordLengthChars(profile.getWordLengthChars());
        attempt.setErrorModel(profile.getErrorModel());
        attempt.setErrorPenaltyPerUnit(profile.getErrorPenaltyPerUnit());
        attempt.setPassingNetWpm(profile.getPassingNetWpm());
        attempt.setBackspaceAllowed(profile.isBackspaceAllowed());
        attempt.setShowLiveWpm(profile.isShowLiveWpm());
        attempt.setReferenceText(passage.getContent());
        attempt.setTypedText("");
        attempt.setStartedAt(Instant.now());
        attempt = attemptRepository.save(attempt);

        log.info("Started attempt {} for user {} on {}", attempt.getId(), userId, profile.getCode());
        return toResponse(attempt, profile, passage);
    }

    /**
     * Picks a passage for the attempt. Randomised among the eligible passages so
     * that repeated practice on the same exam does not drill the same text.
     */
    private Passage pickPassage(ExamProfile profile, String difficulty) {
        List<Passage> candidates = passageRepository.findAllActiveByLanguage(profile.getLanguage());
        if (candidates.isEmpty()) {
            // Fall back to any active passage: an exam profile may be in a
            // language that has no dedicated content yet.
            candidates = passageRepository.findAll().stream().filter(Passage::isActive).toList();
        }
        if (candidates.isEmpty()) {
            throw new BusinessException(ErrorCode.ILLEGAL_STATE,
                    "No passages are available for this exam yet");
        }
        if (difficulty != null && !difficulty.isBlank()) {
            List<Passage> filtered = candidates.stream()
                    .filter(p -> p.getDifficulty().equalsIgnoreCase(difficulty))
                    .toList();
            if (!filtered.isEmpty()) {
                candidates = filtered;
            }
        }
        return candidates.get(java.util.concurrent.ThreadLocalRandom.current().nextInt(candidates.size()));
    }

    // -----------------------------------------------------------------
    // Resume
    // -----------------------------------------------------------------

    @Transactional(readOnly = true)
    public AttemptResponse resume(Long userId, Long attemptId) {
        Attempt attempt = attemptRepository.findByIdAndUserId(attemptId, userId)
                .orElseThrow(() -> NotFoundException.of("Attempt", attemptId));
        if (!attempt.isInProgress()) {
            throw new BusinessException(ErrorCode.ILLEGAL_STATE, "This attempt has already been submitted");
        }
        ExamProfile profile = examProfileService.findByCode(attempt.getExamCode());
        return toResponse(attempt, profile, null);
    }

    // -----------------------------------------------------------------
    // Submit
    // -----------------------------------------------------------------

    @Transactional
    public AttemptResultResponse submit(Long userId, Long attemptId, SubmitAttemptRequest request) {
        Attempt attempt = attemptRepository.findByIdAndUserId(attemptId, userId)
                .orElseThrow(() -> NotFoundException.of("Attempt", attemptId));

        if (!attempt.isInProgress()) {
            // Submitting twice is not an error worth failing the request over,
            // but the stored result must not change. Return what was recorded.
            log.debug("Attempt {} submitted again; returning the stored result", attemptId);
            return toResultResponse(attempt);
        }

        List<AttemptEvent> events = persistEvents(attempt, request);

        // ---- Derive the timing from the recorded events --------------------
        long elapsedMs = deriveElapsedMs(attempt, events);
        int keystrokes = countType(events, AttemptEventType.KEYSTROKE);
        int backspaces = countType(events, AttemptEventType.BACKSPACE);
        int blurs = countType(events, AttemptEventType.BLUR);

        // ---- Recompute the score ------------------------------------------
        ScoringRules rules = new ScoringRules(
                attempt.getDurationSeconds(),
                attempt.getWordLengthChars(),
                attempt.getErrorModel(),
                attempt.getErrorPenaltyPerUnit() == null ? 1.0d : attempt.getErrorPenaltyPerUnit().doubleValue(),
                attempt.getPassingNetWpm() == null ? 0.0d : attempt.getPassingNetWpm().doubleValue(),
                0.0d,
                attempt.isBackspaceAllowed());

        ScoreResult result = scoringEngine.score(
                attempt.getReferenceText(),
                request.typedText(),
                rules,
                elapsedMs,
                keystrokes,
                backspaces);

        // ---- Persist -------------------------------------------------------
        attempt.setTypedText(request.typedText());
        attempt.setStatus(Boolean.TRUE.equals(request.autoSubmitted())
                ? AttemptStatus.AUTO_SUBMITTED
                : AttemptStatus.SUBMITTED);
        attempt.setSubmittedAt(Instant.now());
        attempt.setDurationMs(elapsedMs);
        attempt.setKeystrokeCount(keystrokes);
        attempt.setBackspaceCount(backspaces);
        attempt.setBlurCount(blurs);
        attempt.setGrossWpm(toDecimal(result.grossWpm()));
        attempt.setNetWpm(toDecimal(result.netWpm()));
        attempt.setAccuracyPct(toDecimal(result.accuracyPct()));
        attempt.setFullMistakes(result.fullMistakes());
        attempt.setHalfMistakes(result.halfMistakes());
        attempt.setPassed(result.passed());
        attempt.setScoreJson(writeScoreJson(result));

        List<String> cheatFlags = collectCheatFlags(events);
        attempt.setCheatFlags(String.join(",", cheatFlags));

        attemptRepository.save(attempt);

        // A certificate is issued when a full-length mock is passed. The
        // issuing is idempotent, so a test that is submitted twice does not
        // give two certificates.
        Long certificateId = null;
        try {
            certificateId = certificateService.issueForAttempt(attempt)
                    .map(certificate -> certificate.getId())
                    .orElse(null);
        } catch (RuntimeException e) {
            // A certificate that cannot be issued must not lose the test.
            log.warn("Could not issue a certificate for attempt {}", attemptId, e);
        }

        log.info("Submitted attempt {} for user {}: net {} WPM, accuracy {}%, passed {}",
                attemptId, userId, result.netWpm(), result.accuracyPct(), result.passed());

        AttemptResultResponse response = toResultResponse(attempt);
        return new AttemptResultResponse(
                response.attemptId(), response.examCode(), response.examName(), response.language(),
                response.keyboardLayout(), response.status(), response.grossWpm(), response.netWpm(),
                response.accuracyPct(), response.fullMistakes(), response.halfMistakes(),
                response.totalMistakes(), response.keystrokes(), response.backspaces(),
                response.blurCount(), response.durationMs(), response.typedChars(), response.referenceWords(),
                response.typedWords(), response.correctWords(), response.passed(), response.passingNetWpm(),
                response.startedAt(), response.submittedAt(), response.typedText(), response.referenceText(),
                response.wordDiffs(), response.errorBreakdown(), cheatFlags, certificateId);
    }

    /**
     * Stores the events and returns them.
     */
    private List<AttemptEvent> persistEvents(Attempt attempt, SubmitAttemptRequest request) {
        List<AttemptEvent> saved = new ArrayList<>();
        if (request.events() == null || request.events().isEmpty()) {
            return saved;
        }
        int limit = Math.min(request.events().size(), MAX_KEPT_EVENTS);
        for (int i = 0; i < limit; i++) {
            SubmitAttemptRequest.TimingEvent dto = request.events().get(i);
            AttemptEventType type;
            try {
                type = AttemptEventType.valueOf(dto.type().toUpperCase(java.util.Locale.ROOT));
            } catch (IllegalArgumentException e) {
                log.debug("Ignoring unknown event type {}", dto.type());
                continue;
            }
            AttemptEvent event = new AttemptEvent();
            event.setAttemptId(attempt.getId());
            event.setEventType(type);
            event.setOffsetMs(dto.offsetMs());
            event.setCharIndex(dto.charIndex());
            event.setCharValue(dto.charValue());
            event.setKeyCode(dto.keyCode());
            event.setEventAt(attempt.getStartedAt().plusMillis(dto.offsetMs()));
            saved.add(eventRepository.save(event));
        }
        return saved;
    }

    /**
     * Works out how long the candidate actually took.
     *
     * <p>Uses the recorded event offsets when there are any. Otherwise falls
     * back to the time between the attempt starting and the submission arriving
     * — capped at the attempt's duration so a client cannot inflate its own
     * speed by submitting late.
     */
    long deriveElapsedMs(Attempt attempt, List<AttemptEvent> events) {
        long capMs = attempt.getDurationSeconds() * 1000L;

        if (!events.isEmpty()) {
            long maxOffset = 0;
            for (AttemptEvent event : events) {
                if (event.getOffsetMs() != null && event.getOffsetMs() > maxOffset) {
                    maxOffset = event.getOffsetMs();
                }
            }
            if (maxOffset > 0) {
                return Math.min(maxOffset, capMs);
            }
        }

        long wallClock = Duration.between(attempt.getStartedAt(), Instant.now()).toMillis();
        return Math.max(1L, Math.min(wallClock, capMs));
    }

    private static int countType(List<AttemptEvent> events, AttemptEventType type) {
        int count = 0;
        for (AttemptEvent event : events) {
            if (event.getEventType() == type) {
                count++;
            }
        }
        return count;
    }

    private static List<String> collectCheatFlags(List<AttemptEvent> events) {
        List<String> flags = new ArrayList<>();
        int pastes = 0;
        int drops = 0;
        int copies = 0;
        int contextMenus = 0;
        int blurs = 0;
        for (AttemptEvent event : events) {
            switch (event.getEventType()) {
                case PASTE_ATTEMPT -> pastes++;
                case DROP_ATTEMPT -> drops++;
                case COPY_ATTEMPT -> copies++;
                case CONTEXT_MENU -> contextMenus++;
                case BLUR -> blurs++;
                default -> { }
            }
        }
        if (pastes > 0) {
            flags.add("PASTE_ATTEMPT:" + pastes);
        }
        if (drops > 0) {
            flags.add("DROP_ATTEMPT:" + drops);
        }
        if (copies > 0) {
            flags.add("COPY_ATTEMPT:" + copies);
        }
        if (contextMenus > 0) {
            flags.add("CONTEXT_MENU:" + contextMenus);
        }
        if (blurs > 0) {
            flags.add("BLUR:" + blurs);
        }
        return flags;
    }

    // -----------------------------------------------------------------
    // Read
    // -----------------------------------------------------------------

    @Transactional(readOnly = true)
    public AttemptResultResponse getResult(Long userId, Long attemptId) {
        Attempt attempt = attemptRepository.findByIdAndUserId(attemptId, userId)
                .orElseThrow(() -> NotFoundException.of("Attempt", attemptId));
        return toResultResponse(attempt);
    }

    /**
     * The candidate's recent results, newest first.
     */
    @Transactional(readOnly = true)
    public List<RecentResultResponse> recentResults(Long userId, int limit) {
        return attemptRepository
                .findByUserIdOrderByCreatedAtDesc(userId, PageRequest.of(0, Math.max(1, Math.min(100, limit))))
                .getContent()
                .stream()
                .filter(attempt -> attempt.getSubmittedAt() != null)
                .map(attempt -> new RecentResultResponse(
                        attempt.getId(),
                        attempt.getExamCode(),
                        examName(attempt.getExamCode()),
                        attempt.getNetWpm() == null ? 0.0 : attempt.getNetWpm().doubleValue(),
                        attempt.getAccuracyPct() == null ? 0.0 : attempt.getAccuracyPct().doubleValue(),
                        Boolean.TRUE.equals(attempt.getPassed()),
                        attempt.getSubmittedAt()))
                .toList();
    }

    /**
     * Where the candidate stands against the daily allowance.
     */
    @Transactional(readOnly = true)
    public QuotaStatusResponse quotaStatus(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> NotFoundException.of("User", userId));
        QuotaService.QuotaStatus status = quotaService.status(user);
        return new QuotaStatusResponse(
                status.used(),
                status.limit(),
                status.remaining(),
                status.isPro(),
                status.resetsAt());
    }

    /**
     * The name of an exam, for the dashboard.
     */
    private String examName(String examCode) {
        try {
            return examProfileService.findByCode(examCode).getName();
        } catch (RuntimeException e) {
            // The profile may have been withdrawn since the attempt was made.
            return examCode;
        }
    }

    /**
     * The in-progress attempts for a user, so the frontend can offer to resume.
     */
    @Transactional(readOnly = true)
    public List<AttemptResponse> findResumable(Long userId) {
        Instant now = Instant.now();
        List<Attempt> attempts = attemptRepository.findByUserIdAndStatus(userId, AttemptStatus.IN_PROGRESS);
        List<AttemptResponse> out = new ArrayList<>();
        for (Attempt attempt : attempts) {
            if (attempt.isExpired(now)) {
                continue;
            }
            ExamProfile profile = examProfileService.findByCode(attempt.getExamCode());
            out.add(toResponse(attempt, profile, null));
        }
        return out;
    }

    // -----------------------------------------------------------------
    // Mapping
    // -----------------------------------------------------------------

    private AttemptResponse toResponse(Attempt attempt, ExamProfile profile, Passage passage) {
        Instant now = Instant.now();
        long elapsed = Math.max(0, Duration.between(attempt.getStartedAt(), now).toMillis());
        long remaining = Math.max(0, attempt.getDurationSeconds() * 1000L - elapsed);
        return new AttemptResponse(
                attempt.getId(),
                attempt.getExamCode(),
                profile != null ? profile.getName() : attempt.getExamCode(),
                attempt.getLanguage(),
                attempt.getKeyboardLayout(),
                attempt.getReferenceText(),
                attempt.getDurationSeconds(),
                attempt.getWordLengthChars(),
                attempt.getStartedAt(),
                now,
                elapsed,
                remaining,
                attempt.isBackspaceAllowed(),
                attempt.isShowLiveWpm(),
                attempt.getPassingNetWpm() == null ? 0.0d : attempt.getPassingNetWpm().doubleValue(),
                attempt.getTypedText(),
                attempt.getKeystrokeCount(),
                attempt.getBackspaceCount());
    }

    private AttemptResultResponse toResultResponse(Attempt attempt) {
        ScoreResult stored = readScoreJson(attempt.getScoreJson());

        List<AttemptResultResponse.WordDiffResponse> diffs = new ArrayList<>();
        if (stored != null) {
            for (WordDiff diff : stored.wordDiffs()) {
                diffs.add(new AttemptResultResponse.WordDiffResponse(
                        diff.type().name(), diff.index(), diff.expected(), diff.actual()));
            }
        }

        Map<String, Integer> breakdown = new java.util.LinkedHashMap<>();
        if (stored != null) {
            stored.errorBreakdown().forEach((type, count) -> breakdown.put(type.name(), count));
        }

        List<String> cheatFlags = attempt.getCheatFlags() == null || attempt.getCheatFlags().isBlank()
                ? List.of()
                : List.of(attempt.getCheatFlags().split(","));

        return new AttemptResultResponse(
                attempt.getId(),
                attempt.getExamCode(),
                attempt.getExamCode(),
                attempt.getLanguage(),
                attempt.getKeyboardLayout(),
                attempt.getStatus().name(),
                doubleOf(attempt.getGrossWpm()),
                doubleOf(attempt.getNetWpm()),
                doubleOf(attempt.getAccuracyPct()),
                attempt.getFullMistakes() == null ? 0 : attempt.getFullMistakes(),
                attempt.getHalfMistakes() == null ? 0 : attempt.getHalfMistakes(),
                (attempt.getFullMistakes() == null ? 0 : attempt.getFullMistakes())
                        + (attempt.getHalfMistakes() == null ? 0 : attempt.getHalfMistakes()),
                attempt.getKeystrokeCount(),
                attempt.getBackspaceCount(),
                attempt.getBlurCount(),
                attempt.getDurationMs() == null ? 0L : attempt.getDurationMs(),
                stored == null ? 0 : stored.typedChars(),
                stored == null ? 0 : stored.referenceWords(),
                stored == null ? 0 : stored.typedWords(),
                stored == null ? 0 : stored.correctWords(),
                Boolean.TRUE.equals(attempt.getPassed()),
                attempt.getPassingNetWpm() == null ? 0.0d : attempt.getPassingNetWpm().doubleValue(),
                attempt.getStartedAt(),
                attempt.getSubmittedAt(),
                attempt.getTypedText(),
                attempt.getReferenceText(),
                diffs,
                breakdown,
                cheatFlags,
                null);
    }

    private String writeScoreJson(ScoreResult result) {
        try {
            return objectMapper.writeValueAsString(result);
        } catch (JsonProcessingException e) {
            log.warn("Could not serialise the score result", e);
            return null;
        }
    }

    private ScoreResult readScoreJson(String json) {
        if (json == null || json.isBlank()) {
            return null;
        }
        try {
            return objectMapper.readValue(json, ScoreResult.class);
        } catch (JsonProcessingException e) {
            log.warn("Could not read the stored score result", e);
            return null;
        }
    }

    private static BigDecimal toDecimal(double value) {
        return BigDecimal.valueOf(value).setScale(2, java.math.RoundingMode.HALF_UP);
    }

    private static double doubleOf(BigDecimal value) {
        return value == null ? 0.0d : value.doubleValue();
    }
}
