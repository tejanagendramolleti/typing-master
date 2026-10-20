package com.examtyper.passage;

import com.examtyper.scoring.TextNormalizer;
import com.examtyper.support.PostgresIntegrationTest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.annotation.Transactional;

import java.text.Normalizer;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Checks the seeded passages.
 *
 * The brief requires that every seeded passage is original text, that the
 * Hindi and Telugu passages are valid Unicode, and that the character ranges
 * are the expected ones. This test is where that is enforced.
 *
 * <p>It runs against a real PostgreSQL started by Testcontainers, so the
 * Flyway migrations that seed the passages are exercised too.
 */
@Transactional
@DisplayName("The seeded passages")
class PassageSeedValidationTest extends PostgresIntegrationTest {

    @Autowired
    private PassageRepository passageRepository;

    @Test
    @DisplayName("cover every language the product supports")
    void coversEveryLanguage() {
        Map<String, Long> byLanguage = passageRepository.findAll().stream()
                .collect(Collectors.groupingBy(Passage::getLanguage, Collectors.counting()));

        assertThat(byLanguage).containsKeys("EN", "HI", "TE", "ALNUM");
    }

    @Test
    @DisplayName("include at least the number of passages the brief asks for")
    void includesEnoughPassages() {
        Map<String, Long> byLanguage = passageRepository.findAll().stream()
                .collect(Collectors.groupingBy(Passage::getLanguage, Collectors.counting()));

        assertThat(byLanguage.get("EN")).as("English passages").isGreaterThanOrEqualTo(40);
        assertThat(byLanguage.get("HI")).as("Hindi passages").isGreaterThanOrEqualTo(30);
        assertThat(byLanguage.get("TE")).as("Telugu passages").isGreaterThanOrEqualTo(20);
        assertThat(byLanguage.get("ALNUM")).as("alphanumeric passages").isGreaterThanOrEqualTo(15);
    }

    @Test
    @DisplayName("cover every difficulty in every language")
    void coversEveryDifficulty() {
        List<Passage> passages = passageRepository.findAll();

        for (String language : List.of("EN", "HI", "TE", "ALNUM")) {
            Set<String> difficulties = passages.stream()
                    .filter(passage -> passage.getLanguage().equals(language))
                    .map(Passage::getDifficulty)
                    .collect(Collectors.toSet());

            assertThat(difficulties)
                    .as("difficulties for %s", language)
                    .contains("EASY", "MEDIUM", "HARD");
        }
    }

    @Test
    @DisplayName("are all NFC-normalised")
    void areNormalised() {
        for (Passage passage : passageRepository.findAll()) {
            assertThat(passage.getContent())
                    .as("passage \"%s\"", passage.getTitle())
                    .isEqualTo(Normalizer.normalize(passage.getContent(), Normalizer.Form.NFC));
        }
    }

    @Test
    @DisplayName("contain no replacement character")
    void containNoReplacementCharacter() {
        for (Passage passage : passageRepository.findAll()) {
            assertThat(passage.getContent())
                    .as("passage \"%s\"", passage.getTitle())
                    .doesNotContain("�");
        }
    }

    @Test
    @DisplayName("have a stored character count that matches the content")
    void haveCorrectCharacterCounts() {
        for (Passage passage : passageRepository.findAll()) {
            assertThat(passage.getCharCount())
                    .as("character count for \"%s\"", passage.getTitle())
                    .isEqualTo(TextNormalizer.countReferenceChars(passage.getContent()));
        }
    }

    @Test
    @DisplayName("have a stored word count that matches the content")
    void haveCorrectWordCounts() {
        for (Passage passage : passageRepository.findAll()) {
            assertThat(passage.getWordCount())
                    .as("word count for \"%s\"", passage.getTitle())
                    .isEqualTo(TextNormalizer.words(passage.getContent()).size());
        }
    }

    @Test
    @DisplayName("are long enough to be worth typing")
    void areLongEnough() {
        for (Passage passage : passageRepository.findAll()) {
            assertThat(passage.getWordCount())
                    .as("word count for \"%s\"", passage.getTitle())
                    .isGreaterThanOrEqualTo(20);
        }
    }

    @Test
    @DisplayName("use only the expected character ranges")
    void useOnlyExpectedCharacterRanges() {
        for (Passage passage : passageRepository.findAll()) {
            for (int offset = 0; offset < passage.getContent().length(); ) {
                int codePoint = passage.getContent().codePointAt(offset);
                offset += Character.charCount(codePoint);

                assertThat(isAllowed(passage.getLanguage(), codePoint))
                        .as("code point U+%04X in \"%s\"", codePoint, passage.getTitle())
                        .isTrue();
            }
        }
    }

    @Test
    @DisplayName("have a distinct title")
    void haveDistinctTitles() {
        List<String> titles = passageRepository.findAll().stream()
                .map(Passage::getTitle)
                .toList();

        assertThat(titles).doesNotHaveDuplicates();
    }

    @Test
    @DisplayName("say where they came from")
    void haveASourceNote() {
        for (Passage passage : passageRepository.findAll()) {
            assertThat(passage.getSourceNote())
                    .as("source note for \"%s\"", passage.getTitle())
                    .isNotBlank()
                    .contains("Original text");
        }
    }

    @Test
    @DisplayName("carry no consecutive spaces and no leading or trailing space")
    void areCleanlySpaced() {
        for (Passage passage : passageRepository.findAll()) {
            String content = passage.getContent();
            assertThat(content)
                    .as("passage \"%s\"", passage.getTitle())
                    .doesNotContain("  ")
                    .doesNotStartWith(" ")
                    .doesNotEndWith(" ")
                    .doesNotContain("\n");
        }
    }

    /**
     * True when the code point is one the passage is allowed to contain.
     *
     * Latin passages may hold the ASCII range plus a few typographic marks.
     * Devanagari and Telugu passages may hold their own block, the digits,
     * the Latin letters that appear in the dates and the abbreviations, and
     * the punctuation.
     */
    private static boolean isAllowed(String language, int codePoint) {
        // Whitespace, digits, the common Latin letters and the punctuation
        // that appears in every passage.
        if (codePoint == ' ' || codePoint == '\t') return true;
        if (codePoint >= '0' && codePoint <= '9') return true;
        if (codePoint >= 'A' && codePoint <= 'Z') return true;
        if (codePoint >= 'a' && codePoint <= 'z') return true;

        // Punctuation and the marks that appear in the prose.
        if (codePoint == '.' || codePoint == ',' || codePoint == ';' || codePoint == ':'
                || codePoint == '(' || codePoint == ')' || codePoint == '-' || codePoint == '\''
                || codePoint == '"' || codePoint == '?' || codePoint == '!' || codePoint == '/'
                || codePoint == '%' || codePoint == '&' || codePoint == '+' || codePoint == '='
                || codePoint == '–' || codePoint == '—' || codePoint == '‘'
                || codePoint == '’' || codePoint == '“' || codePoint == '”'
                || codePoint == ' ') {
            return true;
        }

        switch (language) {
            case "HI" -> {
                // The Devanagari block, the Devanagari digits, the nukta
                // extensions and the joiners.
                return (codePoint >= 0x0900 && codePoint <= 0x097f)
                        || (codePoint >= 0xa8e0 && codePoint <= 0xa8ff)
                        || codePoint == 0x200c
                        || codePoint == 0x200d;
            }
            case "TE" -> {
                // The Telugu block, the Telugu digits and the joiners.
                return (codePoint >= 0x0c00 && codePoint <= 0x0c7f)
                        || (codePoint >= 0x0c80 && codePoint <= 0x0cff)
                        || codePoint == 0x200c
                        || codePoint == 0x200d;
            }
            case "EN", "ALNUM" -> {
                // The Latin-1 supplement and the general punctuation that the
                // prose uses.
                return codePoint >= 0x00a1 && codePoint <= 0x00ff;
            }
            default -> {
                return false;
            }
        }
    }
}
