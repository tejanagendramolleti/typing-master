package com.examtyper.leaderboard;

import com.examtyper.leaderboard.LeaderboardService.LeaderboardEntry;
import com.examtyper.leaderboard.LeaderboardService.LeaderboardPeriod;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * The public leaderboards.
 *
 * <p>They are public, because a leaderboard that only the signed-in
 * candidates can see is not a leaderboard. Nothing private is shown: the
 * name is the display name, the email is shown only when the candidate has
 * asked for it, and a candidate who has opted out is not on the board at
 * all.
 */
@RestController
@RequestMapping("/api/v1/leaderboard")
@Tag(name = "Leaderboard", description = "The weekly and all-time boards")
public class LeaderboardController {

    private final LeaderboardService leaderboardService;

    public LeaderboardController(LeaderboardService leaderboardService) {
        this.leaderboardService = leaderboardService;
    }

    @GetMapping("/{examCode}")
    @Operation(summary = "The board for one exam")
    public ResponseEntity<List<LeaderboardEntry>> board(
            @PathVariable String examCode,
            @RequestParam(defaultValue = "WEEK") String period,
            @RequestParam(defaultValue = "50") int limit) {
        return ResponseEntity.ok(
                leaderboardService.board(examCode, LeaderboardPeriod.of(period), limit));
    }
}
