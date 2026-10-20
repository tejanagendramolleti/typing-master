package com.examtyper.attempt;

import com.examtyper.attempt.dto.AttemptResponse;
import com.examtyper.attempt.dto.AttemptResultResponse;
import com.examtyper.attempt.dto.QuotaStatusResponse;
import com.examtyper.attempt.dto.RecentResultResponse;
import com.examtyper.attempt.dto.StartAttemptRequest;
import com.examtyper.attempt.dto.SubmitAttemptRequest;
import com.examtyper.common.web.CurrentUser;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * The typing-test endpoints: start, resume and submit an attempt.
 */
@RestController
@RequestMapping("/api/v1/attempts")
@Tag(name = "Attempts", description = "Start, resume and submit a typing test")
public class AttemptController {

    private final AttemptService attemptService;

    public AttemptController(AttemptService attemptService) {
        this.attemptService = attemptService;
    }

    @PostMapping
    @Operation(summary = "Start a typing test")
    public ResponseEntity<AttemptResponse> start(@Valid @RequestBody StartAttemptRequest request) {
        return ResponseEntity.status(201)
                .body(attemptService.start(CurrentUser.requireId(), request));
    }

    @GetMapping("/resumable")
    @Operation(summary = "List the tests that can be resumed after a page refresh")
    public ResponseEntity<List<AttemptResponse>> resumable() {
        return ResponseEntity.ok(attemptService.findResumable(CurrentUser.requireId()));
    }

    @GetMapping("/{attemptId}")
    @Operation(summary = "Resume an in-progress test")
    public ResponseEntity<AttemptResponse> resume(@PathVariable Long attemptId) {
        return ResponseEntity.ok(attemptService.resume(CurrentUser.requireId(), attemptId));
    }

    @PostMapping("/{attemptId}/submit")
    @Operation(summary = "Submit a finished test. The score is recomputed on the server.")
    public ResponseEntity<AttemptResultResponse> submit(@PathVariable Long attemptId,
                                                        @Valid @RequestBody SubmitAttemptRequest request) {
        return ResponseEntity.ok(attemptService.submit(CurrentUser.requireId(), attemptId, request));
    }

    @GetMapping("/{attemptId}/result")
    @Operation(summary = "The stored result of a submitted test")
    public ResponseEntity<AttemptResultResponse> result(@PathVariable Long attemptId) {
        return ResponseEntity.ok(attemptService.getResult(CurrentUser.requireId(), attemptId));
    }

    @GetMapping("/recent")
    @Operation(summary = "The candidate's recent results")
    public ResponseEntity<List<RecentResultResponse>> recent(
            @RequestParam(defaultValue = "20") int limit) {
        return ResponseEntity.ok(attemptService.recentResults(CurrentUser.requireId(), limit));
    }

    @GetMapping("/quota")
    @Operation(summary = "Where the candidate stands against the daily allowance")
    public ResponseEntity<QuotaStatusResponse> quota() {
        return ResponseEntity.ok(attemptService.quotaStatus(CurrentUser.requireId()));
    }
}
