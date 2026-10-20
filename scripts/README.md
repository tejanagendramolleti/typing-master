# scripts

The helper scripts that sit alongside the application.

## `env.sh`

Puts the local JDK 21 and Maven on the `PATH`. The repository does not
vendor a toolchain — see `DECISIONS.md` D16.

```bash
source scripts/env.sh
mvn -B test
```

`TOOLS_DIR` overrides where the toolchain is looked for. It defaults to
`~/tools`.

## `tools/PassageSqlGenerator.java`

Turns the passage data files into the Flyway migrations that seed the
passage bank.

The passages live in plain UTF-8 files under `data/` rather than inside SQL
literals, because a Devanagari or Telugu character in a SQL string can be
mangled without anyone noticing — and the mangled version still looks
plausible in a diff. The generator reads the plain text, computes the
character and word counts with the same `TextNormalizer` the application
uses, checks that every passage is NFC-normalised, and writes the
migration.

The data file format is:

```
@@TITLE: The title
@@META: EN|GENERAL|EASY
@@CONTENT:
The passage text, over as many lines as it needs.
@@END
```

`@@META` is `language|exam type|difficulty`. The language is one of `EN`,
`HI`, `TE` or `ALNUM`; the difficulty is one of `EASY`, `MEDIUM` or `HARD`.

To regenerate a migration after changing the data:

```bash
cd scripts/tools
javac -cp ../../backend/src/main/java -d . PassageSqlGenerator.java
java -cp ".;../../backend/src/main/java" PassageSqlGenerator \
  ../data/passages-en.txt \
  ../../backend/src/main/resources/db/migration/V3__seed_passages_en.sql \
  V3__seed_passages_en
```

Change the migration number and the output name together — Flyway runs the
migrations in order, and a migration that has already run is never re-run.

The counts in the generated SQL are computed, never typed, so they cannot
drift from the content.

## `data/`

The passage text itself, one file per language.

- `passages-en.txt` — 48 English passages
- `passages-hi.txt` — 36 Hindi passages
- `passages-te.txt` — 21 Telugu passages
- `passages-alnum.txt` — 15 alphanumeric passages

Every passage is original text written for this project. Nothing here is
copied from an exam paper, a news article or a book.

`PassageSeedValidationTest` checks the seeded result: that every passage is
NFC-normalised, that the counts match, that the character ranges are the
expected ones for each script, and that there are enough passages of each
language and difficulty.

## `verify.sh`

Runs the whole check: lint, the backend tests, the frontend tests, the
build and the end-to-end tests. It exits non-zero if any of them fail.
