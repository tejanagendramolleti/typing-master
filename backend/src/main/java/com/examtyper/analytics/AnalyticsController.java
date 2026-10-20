package com.examtyper.analytics;

import com.examtyper.analytics.AnalyticsService.AnalyticsOverview;
import com.examtyper.common.web.CurrentUser;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * The candidate's own analytics.
 *
 * <p>Everything here is about the signed-in candidate. A candidate cannot
 * ask about somebody else's results.
 */
@RestController
@RequestMapping("/api/v1/analytics")
@Tag(name = "Analytics", description = "The candidate's own trends, weak keys and weak words")
public class AnalyticsController {

    private final AnalyticsService analyticsService;

    public AnalyticsController(AnalyticsService analyticsService) {
        this.analyticsService = analyticsService;
    }

    @GetMapping("/overview")
    @Operation(summary = "The candidate's speed and accuracy trends, weak keys and weak words")
    public ResponseEntity<AnalyticsOverview> overview(
            @RequestParam(defaultValue = "50") int limit) {
        return ResponseEntity.ok(analyticsService.overview(CurrentUser.requireId(), limit));
    }
}
