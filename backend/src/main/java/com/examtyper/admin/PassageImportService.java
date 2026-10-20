package com.examtyper.admin;

import com.examtyper.passage.Passage;
import com.examtyper.passage.PassageRepository;
import com.examtyper.scoring.TextNormalizer;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.text.Normalizer;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * The bulk import of passages.
 *
 * <p>The import is a two-step affair. The preview says what would happen,
 * and the import does it. The preview is the important part: an import
 * that silently drops half the rows because of a stray comma is worse than
 * no import at all.
 *
 * <p>Two formats are accepted. The JSON one is an array of objects, and the
 * CSV one has a header row with {@code title}, {@code content},
 * {@code language} and {@code difficulty} in it.
 */
@Service
public class PassageImportService {

    /** The smallest passage that is worth importing. */
    private static final int MINIMUM_WORDS = 20;

    private final PassageRepository passageRepository;

    public PassageImportService(PassageRepository passageRepository) {
        this.passageRepository = passageRepository;
    }

    /**
     * Checks what an import would do, without doing it.
     */
    public ImportPreview preview(ImportRequest request) {
        List<ParsedPassage> parsed = parse(request);
        List<String> errors = new ArrayList<>();
        int valid = 0;

        for (int i = 0; i < parsed.size(); i++) {
            ParsedPassage passage = parsed.get(i);
            String problem = validate(passage);
            if (problem == null) {
                valid++;
            } else {
                errors.add("Row " + (i + 1) + ": " + problem);
            }
        }

        return new ImportPreview(parsed.size(), valid, parsed.size() - valid, errors);
    }

    /**
     * Does the import.
     */
    @Transactional
    public ImportResult doImport(ImportRequest request) {
        List<ParsedPassage> parsed = parse(request);
        int imported = 0;
        int skipped = 0;

        for (ParsedPassage parsedPassage : parsed) {
            if (validate(parsedPassage) != null) {
                skipped++;
                continue;
            }

            Passage passage = new Passage();
            passage.setTitle(parsedPassage.title());
            passage.setContent(parsedPassage.content());
            passage.setLanguage(parsedPassage.language());
            passage.setExamType(parsedPassage.examType());
            passage.setDifficulty(parsedPassage.difficulty());
            passage.setSourceNote("Imported by an administrator.");
            passage.setActive(true);
            passageRepository.save(passage);
            imported++;
        }

        return new ImportResult(imported, skipped);
    }

    /**
     * Checks one passage.
     *
     * @return the problem, or null when the passage is fine
     */
    private String validate(ParsedPassage passage) {
        if (passage.title() == null || passage.title().isBlank()) {
            return "the title is missing";
        }
        if (passage.content() == null || passage.content().isBlank()) {
            return "the content is missing";
        }
        if (!"EN".equals(passage.language())
                && !"HI".equals(passage.language())
                && !"TE".equals(passage.language())
                && !"ALNUM".equals(passage.language())) {
            return "the language must be EN, HI, TE or ALNUM, not \"" + passage.language() + "\"";
        }
        if (!"EASY".equals(passage.difficulty())
                && !"MEDIUM".equals(passage.difficulty())
                && !"HARD".equals(passage.difficulty())) {
            return "the difficulty must be EASY, MEDIUM or HARD, not \""
                    + passage.difficulty() + "\"";
        }
        if (!Normalizer.isNormalized(passage.content(), Normalizer.Form.NFC)) {
            return "the content is not NFC-normalised";
        }
        if (TextNormalizer.words(passage.content()).size() < MINIMUM_WORDS) {
            return "the content has fewer than " + MINIMUM_WORDS + " words";
        }
        if (passage.content().contains("�")) {
            return "the content contains a replacement character";
        }
        return null;
    }

    /**
     * Reads the file into passages.
     */
    private List<ParsedPassage> parse(ImportRequest request) {
        if (request.content() == null || request.content().isBlank()) {
            return List.of();
        }
        if ("json".equalsIgnoreCase(request.format())) {
            return parseJson(request.content());
        }
        return parseCsv(request.content());
    }

    /**
     * Reads a JSON array of passages.
     *
     * <p>A tiny hand-rolled reader is used rather than a JSON library,
     * because the shape is fixed and the alternative is a dependency that
     * would need its own error handling for no gain.
     */
    private List<ParsedPassage> parseJson(String content) {
        List<ParsedPassage> passages = new ArrayList<>();

        // The file is an array of objects. Each object is split on its
        // top-level commas, so a comma inside the content does not split
        // the object.
        int depth = 0;
        boolean inString = false;
        StringBuilder current = new StringBuilder();
        List<String> objects = new ArrayList<>();

        for (int i = 0; i < content.length(); i++) {
            char c = content.charAt(i);

            if (inString) {
                if (c == '\\' && i + 1 < content.length()) {
                    current.append(c).append(content.charAt(++i));
                    continue;
                }
                if (c == '"') {
                    inString = false;
                }
                current.append(c);
                continue;
            }

            switch (c) {
                case '"' -> {
                    inString = true;
                    current.append(c);
                }
                case '{', '[' -> {
                    depth++;
                    current.append(c);
                }
                case '}', ']' -> {
                    depth--;
                    current.append(c);
                    if (depth == 0) {
                        objects.add(current.toString());
                        current.setLength(0);
                    }
                }
                case ',' -> {
                    if (depth == 1) {
                        objects.add(current.toString());
                        current.setLength(0);
                    } else {
                        current.append(c);
                    }
                }
                default -> current.append(c);
            }
        }

        for (String object : objects) {
            if (!object.startsWith("{")) {
                continue;
            }
            passages.add(new ParsedPassage(
                    field(object, "title"),
                    field(object, "content"),
                    upper(field(object, "language")),
                    upper(field(object, "difficulty")),
                    field(object, "examType")));
        }

        return passages;
    }

    /**
     * Reads one field out of a JSON object.
     */
    private String field(String object, String name) {
        String key = "\"" + name + "\"";
        int at = object.indexOf(key);
        if (at < 0) {
            return null;
        }
        int colon = object.indexOf(':', at + key.length());
        if (colon < 0) {
            return null;
        }

        int i = colon + 1;
        while (i < object.length() && Character.isWhitespace(object.charAt(i))) {
            i++;
        }
        if (i >= object.length()) {
            return null;
        }

        if (object.charAt(i) == '"') {
            StringBuilder value = new StringBuilder();
            i++;
            while (i < object.length()) {
                char c = object.charAt(i);
                if (c == '\\' && i + 1 < object.length()) {
                    char next = object.charAt(++i);
                    value.append(switch (next) {
                        case 'n' -> '\n';
                        case 't' -> '\t';
                        case 'r' -> '\r';
                        case '"' -> '"';
                        case '\\' -> '\\';
                        default -> next;
                    });
                } else if (c == '"') {
                    break;
                } else {
                    value.append(c);
                }
                i++;
            }
            return value.toString();
        }

        // A value that is not a string — a number, for example.
        int end = i;
        while (end < object.length() && ",}".indexOf(object.charAt(end)) < 0) {
            end++;
        }
        return object.substring(i, end).trim();
    }

    /**
     * Reads a CSV file of passages.
     */
    private List<ParsedPassage> parseCsv(String content) {
        List<ParsedPassage> passages = new ArrayList<>();
        List<List<String>> rows = readCsvRows(content);

        if (rows.isEmpty()) {
            return passages;
        }

        List<String> header = rows.get(0).stream()
                .map(h -> h.trim().toLowerCase(Locale.ROOT))
                .toList();

        int titleAt = header.indexOf("title");
        int contentAt = header.indexOf("content");
        int languageAt = header.indexOf("language");
        int difficultyAt = header.indexOf("difficulty");
        int examTypeAt = header.indexOf("examtype");

        if (contentAt < 0) {
            return passages;
        }

        for (int i = 1; i < rows.size(); i++) {
            List<String> row = rows.get(i);
            if (row.size() <= contentAt) {
                continue;
            }
            passages.add(new ParsedPassage(
                    titleAt >= 0 && row.size() > titleAt ? row.get(titleAt) : null,
                    row.get(contentAt),
                    languageAt >= 0 && row.size() > languageAt
                            ? upper(row.get(languageAt)) : "EN",
                    difficultyAt >= 0 && row.size() > difficultyAt
                            ? upper(row.get(difficultyAt)) : "MEDIUM",
                    examTypeAt >= 0 && row.size() > examTypeAt ? row.get(examTypeAt) : "GENERAL"));
        }

        return passages;
    }

    /**
     * Reads the rows of a CSV file.
     *
     * <p>A quoted field may contain a comma, and a doubled quote inside a
     * quoted field is a literal quote.
     */
    private List<List<String>> readCsvRows(String content) {
        List<List<String>> rows = new ArrayList<>();
        List<String> row = new ArrayList<>();
        StringBuilder field = new StringBuilder();
        boolean inQuotes = false;

        for (int i = 0; i < content.length(); i++) {
            char c = content.charAt(i);

            if (inQuotes) {
                if (c == '"') {
                    if (i + 1 < content.length() && content.charAt(i + 1) == '"') {
                        field.append('"');
                        i++;
                    } else {
                        inQuotes = false;
                    }
                } else {
                    field.append(c);
                }
                continue;
            }

            switch (c) {
                case '"' -> inQuotes = true;
                case ',' -> {
                    row.add(field.toString());
                    field.setLength(0);
                }
                case '\n' -> {
                    row.add(field.toString());
                    field.setLength(0);
                    rows.add(row);
                    row = new ArrayList<>();
                }
                case '\r' -> {
                    // A Windows line ending. The newline that follows adds
                    // the row.
                }
                default -> field.append(c);
            }
        }

        if (field.length() > 0 || !row.isEmpty()) {
            row.add(field.toString());
            rows.add(row);
        }

        return rows;
    }

    private static String upper(String value) {
        return value == null ? null : value.trim().toUpperCase(Locale.ROOT);
    }

    /**
     * One passage read out of the file.
     */
    private record ParsedPassage(
            String title,
            String content,
            String language,
            String difficulty,
            String examType
    ) {
    }

    /**
     * The request to import.
     *
     * @param format  {@code json} or {@code csv}
     * @param content the file
     */
    public record ImportRequest(String format, String content) {
    }

    /**
     * What an import would do.
     *
     * @param total   the rows in the file
     * @param valid   the rows that would be imported
     * @param invalid the rows that would be rejected
     * @param errors  why each rejected row was rejected
     */
    public record ImportPreview(
            int total,
            int valid,
            int invalid,
            List<String> errors
    ) {
    }

    /**
     * What an import did.
     *
     * @param imported the rows that were imported
     * @param skipped  the rows that were rejected
     */
    public record ImportResult(int imported, int skipped) {
    }
}
