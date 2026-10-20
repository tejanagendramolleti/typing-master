package com.examtyper.drills;

import com.examtyper.common.web.CurrentUser;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * The smart drill.
 *
 * <p>It is a Pro feature, and the gate is on the server.
 */
@RestController
@RequestMapping("/api/v1/drills")
@Tag(name = "Drills", description = "Practice built from the candidate's own weak spots")
public class DrillController {

    private final DrillService drillService;
    private final com.examtyper.billing.service.SubscriptionService subscriptionService;

    public DrillController(DrillService drillService,
                           com.examtyper.billing.service.SubscriptionService subscriptionService) {
        this.drillService = drillService;
        this.subscriptionService = subscriptionService;
    }

    @GetMapping
    @Operation(summary = "A drill built from the candidate's weak words and weak keys")
    public ResponseEntity<DrillService.Drill> drill(
            @RequestParam(defaultValue = "EN") String language,
            @RequestParam(defaultValue = "80") int wordCount) {

        Long userId = CurrentUser.requireId();
        // The server-side gate. The interface hides the button, but this is
        // what actually stops a free candidate from using the drill.
        subscriptionService.requirePro(userId);

        return ResponseEntity.ok(drillService.drill(userId, language, wordCount));
    }
}
