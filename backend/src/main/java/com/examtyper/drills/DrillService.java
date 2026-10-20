package com.examtyper.drills;

import com.examtyper.analytics.AnalyticsService;
import com.examtyper.analytics.AnalyticsService.WeakKey;
import com.examtyper.analytics.AnalyticsService.WeakWord;
import com.examtyper.common.error.BusinessException;
import com.examtyper.common.error.ErrorCode;
import com.examtyper.drills.PassageGenerator.DrillRequest;
import com.examtyper.drills.PassageGenerator.GeneratedPassage;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * The smart drill.
 *
 * <p>A drill is built from what the candidate actually got wrong: the
 * words they missed and the keys they are slow on. It is entirely
 * algorithmic — the passage generator only supplies the prose, and the
 * default one needs no model and no key.
 */
@Service
public class DrillService {

    private final AnalyticsService analyticsService;
    private final PassageGenerator passageGenerator;

    public DrillService(AnalyticsService analyticsService, PassageGenerator passageGenerator) {
        this.analyticsService = analyticsService;
        this.passageGenerator = passageGenerator;
    }

    /**
     * Builds a drill for a candidate.
     *
     * @param userId    the candidate
     * @param language  the language to drill in
     * @param wordCount how long the passage should be
     */
    @Transactional(readOnly = true)
    public Drill drill(Long userId, String language, int wordCount) {
        AnalyticsService.AnalyticsOverview overview = analyticsService.overview(userId, 50);

        if (overview.totalAttempts() == 0) {
            throw new BusinessException(ErrorCode.VALIDATION_FAILED,
                    "Take a few tests first — a drill is built from what you have got wrong.");
        }

        List<String> focusWords = overview.weakWords().stream()
                .map(WeakWord::word)
                .limit(12)
                .toList();

        List<String> focusKeys = overview.weakKeys().stream()
                .map(WeakKey::key)
                .limit(8)
                .toList();

        if (focusWords.isEmpty() && focusKeys.isEmpty()) {
            throw new BusinessException(ErrorCode.VALIDATION_FAILED,
                    "You have not made enough mistakes yet for the drill to be worth doing.");
        }

        GeneratedPassage passage = passageGenerator.generate(new DrillRequest(
                language,
                focusWords,
                focusKeys,
                wordCount <= 0 ? 80 : wordCount));

        return new Drill(
                passage.title(),
                passage.content(),
                passage.language(),
                focusWords,
                focusKeys,
                passage.source());
    }

    /**
     * A drill.
     *
     * @param title      the title
     * @param content    the passage to type
     * @param language   the language
     * @param focusWords the words the drill is built around
     * @param focusKeys  the keys the drill is built around
     * @param source     where the passage came from
     */
    public record Drill(
            String title,
            String content,
            String language,
            List<String> focusWords,
            List<String> focusKeys,
            String source
    ) {
    }
}
