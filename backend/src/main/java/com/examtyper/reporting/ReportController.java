package com.examtyper.reporting;

import com.examtyper.common.web.CurrentUser;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * The downloadable reports.
 *
 * <p>The result report is a Pro feature. The gate is on the server, not
 * on the button.
 */
@RestController
@RequestMapping("/api/v1/reports")
@Tag(name = "Reports", description = "The downloadable PDF reports")
public class ReportController {

    private final ResultReportService reportService;
    private final com.examtyper.billing.service.SubscriptionService subscriptionService;

    public ReportController(ResultReportService reportService,
                            com.examtyper.billing.service.SubscriptionService subscriptionService) {
        this.reportService = reportService;
        this.subscriptionService = subscriptionService;
    }

    @GetMapping("/attempts/{attemptId}")
    @Operation(summary = "The result of a test as a PDF")
    public ResponseEntity<Resource> report(@PathVariable Long attemptId) {
        Long userId = CurrentUser.requireId();
        subscriptionService.requirePro(userId);

        byte[] pdf = reportService.toPdf(userId, attemptId);

        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"examtyper-report-" + attemptId + ".pdf\"")
                .contentLength(pdf.length)
                .body(new ByteArrayResource(pdf));
    }
}
