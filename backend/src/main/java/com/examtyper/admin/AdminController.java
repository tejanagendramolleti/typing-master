package com.examtyper.admin;

import com.examtyper.admin.PassageImportService.ImportPreview;
import com.examtyper.admin.PassageImportService.ImportRequest;
import com.examtyper.admin.PassageImportService.ImportResult;
import com.examtyper.attempt.AttemptRepository;
import com.examtyper.billing.entity.Plan;
import com.examtyper.billing.repository.PlanRepository;
import com.examtyper.billing.repository.SubscriptionRepository;
import com.examtyper.exam.ExamProfile;
import com.examtyper.exam.ExamProfileRepository;
import com.examtyper.passage.Passage;
import com.examtyper.passage.PassageRepository;
import com.examtyper.user.UserRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

/**
 * The admin endpoints.
 *
 * <p>Everything under this path needs the ADMIN role, and the check is in
 * the security configuration rather than in each method, so a new endpoint
 * is protected by default.
 */
@RestController
@RequestMapping("/api/v1/admin")
@Tag(name = "Administration", description = "Managing the content, the users and the billing")
public class AdminController {

    private final PassageRepository passageRepository;
    private final ExamProfileRepository examProfileRepository;
    private final PlanRepository planRepository;
    private final AttemptRepository attemptRepository;
    private final UserRepository userRepository;
    private final SubscriptionRepository subscriptionRepository;
    private final PassageImportService importService;

    public AdminController(PassageRepository passageRepository,
                           ExamProfileRepository examProfileRepository,
                           PlanRepository planRepository,
                           AttemptRepository attemptRepository,
                           UserRepository userRepository,
                           SubscriptionRepository subscriptionRepository,
                           PassageImportService importService) {
        this.passageRepository = passageRepository;
        this.examProfileRepository = examProfileRepository;
        this.planRepository = planRepository;
        this.attemptRepository = attemptRepository;
        this.userRepository = userRepository;
        this.subscriptionRepository = subscriptionRepository;
        this.importService = importService;
    }

    // ---- The passages ----------------------------------------------------

    @GetMapping("/passages")
    @Operation(summary = "The passage bank")
    public ResponseEntity<Page<AdminPassageResponse>> passages(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {

        Page<Passage> passages = passageRepository.findAll(
                PageRequest.of(Math.max(0, page), Math.min(200, Math.max(1, size)),
                        Sort.by(Sort.Direction.ASC, "id")));

        return ResponseEntity.ok(passages.map(AdminPassageResponse::from));
    }

    @PatchMapping("/passages/{passageId}/toggle")
    @Operation(summary = "Activate or deactivate a passage")
    public ResponseEntity<AdminPassageResponse> togglePassage(@PathVariable Long passageId) {
        Passage passage = passageRepository.findById(passageId)
                .orElseThrow(() -> com.examtyper.common.error.NotFoundException.of("Passage", passageId));

        passage.setActive(!passage.isActive());
        return ResponseEntity.ok(AdminPassageResponse.from(passageRepository.save(passage)));
    }

    @PostMapping("/passages/import/preview")
    @Operation(summary = "Check what an import would do, without doing it")
    public ResponseEntity<ImportPreview> previewImport(@RequestBody ImportRequest request) {
        return ResponseEntity.ok(importService.preview(request));
    }

    @PostMapping("/passages/import")
    @Operation(summary = "Import passages in bulk")
    public ResponseEntity<ImportResult> runImport(@RequestBody ImportRequest request) {
        return ResponseEntity.ok(importService.doImport(request));
    }

    // ---- The exam profiles ------------------------------------------------

    @GetMapping("/exams")
    @Operation(summary = "The exam profiles")
    public ResponseEntity<List<AdminExamResponse>> exams() {
        List<AdminExamResponse> exams = examProfileRepository.findAll().stream()
                .map(AdminExamResponse::from)
                .toList();
        return ResponseEntity.ok(exams);
    }

    @PatchMapping("/exams/{code}/active")
    @Operation(summary = "Activate or deactivate an exam profile")
    public ResponseEntity<AdminExamResponse> toggleExam(@PathVariable String code,
                                                        @RequestParam boolean active) {
        ExamProfile exam = examProfileRepository.findByCode(code)
                .orElseThrow(() -> com.examtyper.common.error.NotFoundException.of("Exam profile", code));

        exam.setActive(active);
        return ResponseEntity.ok(AdminExamResponse.from(examProfileRepository.save(exam)));
    }

    // ---- The plans --------------------------------------------------------

    @GetMapping("/plans")
    @Operation(summary = "The pricing plans")
    public ResponseEntity<List<AdminPlanResponse>> plans() {
        List<AdminPlanResponse> plans = planRepository.findAll().stream()
                .map(AdminPlanResponse::from)
                .toList();
        return ResponseEntity.ok(plans);
    }

    // ---- The summary ------------------------------------------------------

    @GetMapping("/stats")
    @Operation(summary = "The summary figures")
    public ResponseEntity<AdminStats> stats() {
        Instant weekAgo = Instant.now().minus(7, ChronoUnit.DAYS);

        return ResponseEntity.ok(new AdminStats(
                userRepository.count(),
                attemptRepository.count(),
                passageRepository.count(),
                subscriptionRepository.countByStatusAndExpiresAtAfter("ACTIVE", Instant.now()),
                attemptRepository.countSubmittedSince(weekAgo),
                planRepository.findByActiveTrueOrderBySortOrderAsc().size()));
    }

    // ---- The DTOs ---------------------------------------------------------

    /**
     * A passage in the administrator's list.
     */
    public record AdminPassageResponse(
            Long id,
            String title,
            String language,
            String examType,
            String difficulty,
            int wordCount,
            int charCount,
            boolean active
    ) {
        static AdminPassageResponse from(Passage passage) {
            return new AdminPassageResponse(
                    passage.getId(),
                    passage.getTitle(),
                    passage.getLanguage(),
                    passage.getExamType(),
                    passage.getDifficulty(),
                    passage.getWordCount(),
                    passage.getCharCount(),
                    passage.isActive());
        }
    }

    /**
     * An exam profile in the administrator's list.
     */
    public record AdminExamResponse(
            Long id,
            String code,
            String name,
            String language,
            String keyboardLayout,
            int durationSeconds,
            double passingNetWpm,
            double minAccuracyPct,
            boolean backspaceAllowed,
            boolean active
    ) {
        static AdminExamResponse from(ExamProfile exam) {
            return new AdminExamResponse(
                    exam.getId(),
                    exam.getCode(),
                    exam.getName(),
                    exam.getLanguage(),
                    exam.getKeyboardLayout(),
                    exam.getDurationSeconds(),
                    exam.getPassingNetWpm() == null ? 0.0 : exam.getPassingNetWpm().doubleValue(),
                    exam.getMinAccuracyPct() == null ? 0.0 : exam.getMinAccuracyPct().doubleValue(),
                    exam.isBackspaceAllowed(),
                    exam.isActive());
        }
    }

    /**
     * A plan in the administrator's list.
     */
    public record AdminPlanResponse(
            Long id,
            String code,
            String name,
            int pricePaise,
            String currency,
            int durationDays,
            String interval,
            boolean active
    ) {
        static AdminPlanResponse from(Plan plan) {
            return new AdminPlanResponse(
                    plan.getId(),
                    plan.getCode(),
                    plan.getName(),
                    plan.getPricePaise(),
                    plan.getCurrency(),
                    plan.getDurationDays(),
                    plan.getInterval(),
                    plan.isActive());
        }
    }

    /**
     * The summary figures.
     *
     * @param totalUsers          the accounts
     * @param totalAttempts       the tests
     * @param totalPassages       the passages
     * @param activeSubscriptions the subscriptions that are running
     * @param attemptsLast7Days   the tests in the last week
     * @param activePlans         the plans on offer
     */
    public record AdminStats(
            long totalUsers,
            long totalAttempts,
            long totalPassages,
            long activeSubscriptions,
            long attemptsLast7Days,
            int activePlans
    ) {
    }
}
