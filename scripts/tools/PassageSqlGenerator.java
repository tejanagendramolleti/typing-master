import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.List;

import com.examtyper.scoring.TextNormalizer;

/**
 * Turns a passage data file into a Flyway migration.
 *
 * The passage text is written in plain UTF-8 files rather than inside SQL
 * literals, because the Indic scripts are easy to damage when they are
 * escaped into a query string. The generator computes the character and word
 * counts the database needs, and checks that every passage is NFC-normalised
 * before it writes anything.
 *
 * <p>Usage: {@code java PassageSqlGenerator <data-file> <output-file> <migration-name>}
 *
 * <p>The data file format is:
 *
 * <pre>
 * @@TITLE: The title
 * @@META: EN|GENERAL|EASY
 * @@CONTENT:
 * The passage text, over as many lines as it needs.
 * @@END
 * </pre>
 */
public final class PassageSqlGenerator {

    /** The note attached to every seeded passage. */
    private static final String SOURCE_NOTE =
            "Original text written for ExamTyper. Not copied from any exam paper, "
            + "news article or book.";

    public static void main(String[] args) throws IOException {
        if (args.length < 3) {
            System.err.println("Usage: PassageSqlGenerator <data-file> <output-file> <migration-name>");
            System.exit(2);
        }

        Path dataFile = Path.of(args[0]);
        Path outputFile = Path.of(args[1]);
        String migrationName = args[2];

        List<Passage> passages = parse(dataFile);
        validate(passages);

        StringBuilder sql = new StringBuilder();
        sql.append("-- -----------------------------------------------------------------------------\n");
        sql.append("-- ").append(migrationName).append("\n");
        sql.append("--\n");
        sql.append("-- Seed passages, all of them original text written for this project. Nothing\n");
        sql.append("-- here is copied from an exam paper, a news article or a book.\n");
        sql.append("--\n");
        sql.append("-- The character and word counts are computed by scripts/tools/PassageSqlGenerator.java\n");
        sql.append("-- rather than typed by hand, so they cannot drift from the content.\n");
        sql.append("-- -----------------------------------------------------------------------------\n");
        sql.append("\n");
        sql.append("INSERT INTO passages (title, content, language, exam_type, difficulty, source_note, char_count, word_count)\n");
        sql.append("VALUES\n");

        for (int i = 0; i < passages.size(); i++) {
            Passage passage = passages.get(i);
            sql.append("(");
            sql.append(quote(passage.title)).append(", ");
            sql.append(quote(passage.content)).append(", ");
            sql.append(quote(passage.language)).append(", ");
            sql.append(quote(passage.examType)).append(", ");
            sql.append(quote(passage.difficulty)).append(", ");
            sql.append(quote(SOURCE_NOTE)).append(", ");
            sql.append(passage.charCount).append(", ");
            sql.append(passage.wordCount);
            sql.append(")");
            if (i < passages.size() - 1) {
                sql.append(",");
            }
            sql.append("\n");
        }
        sql.append("ON CONFLICT DO NOTHING;\n");

        Files.writeString(outputFile, sql.toString(), StandardCharsets.UTF_8);

        System.out.printf(
                "Wrote %d passages to %s (%d characters, %d words)%n",
                passages.size(), outputFile.getFileName(), totalChars(passages), totalWords(passages));
    }

    private static List<Passage> parse(Path dataFile) throws IOException {
        List<String> lines = Files.readAllLines(dataFile, StandardCharsets.UTF_8);
        List<Passage> passages = new ArrayList<>();

        String title = null;
        String language = null;
        String examType = null;
        String difficulty = null;
        StringBuilder content = null;

        for (String line : lines) {
            if (line.startsWith("@@TITLE:")) {
                title = line.substring("@@TITLE:".length()).trim();
            } else if (line.startsWith("@@META:")) {
                String[] parts = line.substring("@@META:".length()).trim().split("\\|");
                if (parts.length != 3) {
                    throw new IllegalStateException("Bad @@META line: " + line);
                }
                language = parts[0].trim();
                examType = parts[1].trim();
                difficulty = parts[2].trim();
            } else if (line.startsWith("@@CONTENT:")) {
                content = new StringBuilder();
            } else if (line.startsWith("@@END")) {
                if (content == null || title == null || language == null) {
                    throw new IllegalStateException("@@END without a complete passage");
                }
                passages.add(build(title, language, examType, difficulty, content.toString()));
                title = null;
                language = null;
                examType = null;
                difficulty = null;
                content = null;
            } else if (content != null) {
                content.append(line).append('\n');
            }
        }

        if (passages.isEmpty()) {
            throw new IllegalStateException("No passages found in " + dataFile);
        }
        return passages;
    }

    private static Passage build(
            String title, String language, String examType, String difficulty, String rawContent) {
        // The content is stored on one line, with the line breaks turned into
        // spaces, so the typing test shows a continuous passage.
        String content = rawContent.replaceAll("\\s+", " ").trim();

        // The counts come from the same code the application uses, so the
        // database and the entity can never disagree about them.
        int charCount = TextNormalizer.countReferenceChars(content);
        int wordCount = TextNormalizer.words(content).size();

        return new Passage(title, content, language, examType, difficulty, charCount, wordCount);
    }

    private static void validate(List<Passage> passages) {
        for (Passage passage : passages) {
            if (!Normalizer.isNormalized(passage.content, Normalizer.Form.NFC)) {
                throw new IllegalStateException(
                        "Passage \"" + passage.title + "\" is not NFC-normalised");
            }
            if (passage.wordCount < 20) {
                throw new IllegalStateException(
                        "Passage \"" + passage.title + "\" has only " + passage.wordCount + " words");
            }
            if (!passage.title.isBlank() && passage.title.length() > 200) {
                throw new IllegalStateException("Title too long: " + passage.title);
            }
        }
    }

    private static int totalChars(List<Passage> passages) {
        int total = 0;
        for (Passage passage : passages) {
            total += passage.charCount;
        }
        return total;
    }

    private static int totalWords(List<Passage> passages) {
        int total = 0;
        for (Passage passage : passages) {
            total += passage.wordCount;
        }
        return total;
    }

    /** Quotes a string for SQL, doubling any single quote it contains. */
    private static String quote(String value) {
        return "'" + value.replace("'", "''") + "'";
    }

    /** One seeded passage. */
    private record Passage(
            String title,
            String content,
            String language,
            String examType,
            String difficulty,
            int charCount,
            int wordCount) {}
}
