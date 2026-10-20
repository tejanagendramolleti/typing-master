package com.examtyper.drills;

import com.examtyper.common.config.AppProperties;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Random;

/**
 * The default passage generator: templates, not a language model.
 *
 * <p>It builds a passage out of sentences that contain the words and the
 * keys the candidate gets wrong. The prose is plain and the sentences are
 * short, which is what a drill wants — a drill is about the difficult
 * words, not about reading.
 *
 * <p>When the AI mode is switched on, a real generator is used instead.
 * The drill logic does not change, because the interface is the same.
 */
@Component
public class TemplatePassageGenerator implements PassageGenerator {

    private final AppProperties props;
    private final Random random = new Random();

    public TemplatePassageGenerator(AppProperties props) {
        this.props = props;
    }

    @Override
    public GeneratedPassage generate(DrillRequest request) {
        List<String> focusWords = request.focusWords() == null ? List.of() : request.focusWords();
        List<String> focusKeys = request.focusKeys() == null ? List.of() : request.focusKeys();

        int wanted = Math.max(20, request.wordCount());
        List<String> words = new ArrayList<>();

        // The drill alternates between the difficult words and the ordinary
        // ones, so the candidate practises the hard part in context rather
        // than in isolation.
        int difficultIndex = 0;
        int ordinaryIndex = 0;
        while (words.size() < wanted) {
            if (!focusWords.isEmpty() && difficultIndex % 3 == 0) {
                words.add(focusWords.get(difficultIndex % focusWords.size()));
                difficultIndex++;
            } else {
                words.add(ordinaryWord(request.language(), ordinaryIndex));
                ordinaryIndex++;
            }
        }

        String content = String.join(" ", words);
        String title = focusWords.isEmpty()
                ? "Drill passage"
                : "Drill: " + String.join(", ", focusWords.subList(0, Math.min(3, focusWords.size())));

        return new GeneratedPassage(
                title,
                content,
                request.language(),
                focusKeys.isEmpty() ? "template" : "template, focused on " + String.join(", ", focusKeys));
    }

    @Override
    public boolean isAvailable() {
        return true;
    }

    /**
     * An ordinary word, from a small list.
     *
     * <p>The list is deliberately small and entirely English. The drill's
     * job is the difficult words; the ordinary ones only need to be real
     * words, so that the passage reads like text rather than like a list.
     */
    private String ordinaryWord(String language, int index) {
        List<String> words = switch (language == null ? "EN" : language.toUpperCase(Locale.ROOT)) {
            case "HI" -> HINDI_WORDS;
            case "TE" -> TELUGU_WORDS;
            case "ALNUM" -> ALPHANUMERIC_WORDS;
            default -> ENGLISH_WORDS;
        };
        return words.get(index % words.size());
    }

    private static final List<String> ENGLISH_WORDS = List.of(
            "the", "office", "notice", "was", "issued", "on", "the", "morning",
            "and", "the", "committee", "agreed", "that", "the", "report",
            "should", "be", "prepared", "with", "the", "figures", "for",
            "each", "quarter", "and", "placed", "before", "the", "secretary",
            "a", "short", "account", "of", "the", "work", "done", "during",
            "the", "period", "under", "review", "was", "also", "appended");

    private static final List<String> HINDI_WORDS = List.of(
            "कार्यालय", "सूचना", "जारी", "की", "गई", "और", "समिति", "ने",
            "तय", "किया", "कि", "रिपोर्ट", "तैयार", "की", "जाएगी", "तथा",
            "आंकड़े", "पेश", "किए", "जाएंगे", "मासिक", "समीक्षा", "बैठक",
            "में", "दिए", "गए", "सुझावों", "पर", "विचार", "किया", "जाएगा",
            "सभी", "अधिकारियों", "को", "इस", "बात", "की", "जानकारी", "दी",
            "गई", "है", "और", "वे", "समय", "पर", "कार्रवाई", "कर", "सकते");

    private static final List<String> TELUGU_WORDS = List.of(
            "కార్యాలయం", "ఇచ్చిన", "నోటీసు", "ప్రకారం", "ఈ", "కమిటీ",
            "నిర్ణయించింది", "రిపోర్ట్", "తయారు", "చేయాలి", "మరియు",
            "ఆంకెలు", "మందు", "అధికారికి", "అందించాలి", "ఈ", "సమావేశంలో",
            "చర్చ", "జరిగి", "అభ్యసన", "కొరకు", "చేయాలి", "అన్ని",
            "అధికారులకు", "ఈ", "విషయం", "తెలియజేయబడింది");

    private static final List<String> ALPHANUMERIC_WORDS = List.of(
            "4821", "7390", "1563", "9087", "2346", "6175", "3829", "4501",
            "7738", "2094", "6157", "3482", "9063", "1275", "8406", "3591");
}
