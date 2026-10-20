# PROGRESS

Append-only log of what was done, phase by phase.

---

## Phase 1 — Scaffold, Docker, DB, verify harness

**Status: in progress**

- Created the repository layout: `backend/`, `frontend/`, `e2e/`, `scripts/`, `docs/`.
- Bootstrapped the local toolchain: JDK 21.0.12 (Temurin) and Maven 3.9.9 under
  `C:\Users\tejan\tools`, wired up through `scripts/env.sh` so every build command
  resolves the same toolchain. Docker Desktop 29.6.1 was started for the
  container-based path.
- Wrote `PLAN.md` with the full architecture, folder layout and phase checklist.
- Wrote `DECISIONS.md` recording the design decisions taken so far.
- Backend Maven project: Spring Boot 3.3.5, Java 21, JPA, Security, Validation,
  Flyway, PostgreSQL, springdoc-openapi, JJWT, OpenPDF, Actuator, Caffeine cache.
- `application.yml` with `dev`/`test`/`prod` profiles driven entirely by env vars.
- Full schema in `backend/src/main/resources/db/migration/V1__init.sql`:
  19 tables, 16 explicitly created sequences, and indexes on every hot query path
  (attempts by user/exam, subscriptions by expiry, orders by user/status,
  passages by selection tuple).
- Common infrastructure: `ApiError` envelope, `ErrorCode` enum,
  `GlobalExceptionHandler`, `RequestIdFilter` (echoes `X-Request-Id`, MDC-correlated),
  `PageRequest`/`PageResponse` pagination, typed `AppProperties`.
- Docker Compose with postgres + backend + frontend, health checks and a
  dependency order that waits for each service to be healthy.
- Dockerfiles: multi-stage Maven build for the backend (unprivileged runtime
  user), Node build + nginx for the frontend with SPA fallback and security headers.
- Frontend scaffold: Vite + React 18 + TS + Tailwind + Vitest + Playwright,
  with `@/` path alias and a coverage threshold for the keyboard mappers.

## Phase 2 — Scoring engine (started early because everything depends on it)

**Status: complete**

- `scoring` package written as a pure, Spring-free module:
  - `ScoringEngine` — gross WPM, net WPM, accuracy, pass/fail, error breakdown.
  - `WordAligner` — Levenshtein alignment over words with a backtrace.
  - `WordDiffRefiner` — second pass that recognises merged and split words
    (missing / extra space) and reports them as a single spacing half mistake.
  - `ErrorClassifier` — case / punctuation / spacing / wrong classification.
  - `TextNormalizer` — NFC normalisation plus comparison keys that keep Unicode
    combining marks, so Hindi and Telugu matras are not silently dropped.
  - `ErrorModel` — `FULL_AND_HALF_MISTAKES`, `PER_ERROR_PENALTY`, `ACCURACY_ONLY`.
  - `ScoringRules` — immutable rule snapshot taken from the exam profile.
- **65 unit tests, all passing.** Coverage includes perfect runs, empty and null
  submissions, extra words, skipped words, case-only errors, punctuation, spacing,
  trailing and leading whitespace, Hindi conjuncts, Devanagari and Telugu NFD/NFC
  equivalence, very short and very long text, all three error models, pass/fail
  boundaries and keystroke accounting.

**Two real bugs were found and fixed by these tests:**
1. `Character.isLetterOrDigit` drops Devanagari and Telugu combining marks, which
   made two genuinely different Hindi words compare equal. Fixed by keeping
   marks in the comparison keys.
2. Extra words were not reflected in the accuracy figure — appending a word to a
   perfect run reported 100% accuracy. Fixed with a weighted, symmetric accuracy
   definition (see `DECISIONS.md` D1).

## Phase 3 — Auth, users, roles, security

**Status: complete except rate limiting and the mail sender**

- `AuthService` — register, login, refresh, logout, forgot password, reset password,
  current user, update profile.
  - Emails are normalised and unique; passwords are hashed with BCrypt at
    strength 12.
  - A login attempt for an unknown email compares against a dummy BCrypt hash,
    so the response time does not reveal whether the account exists.
  - The refresh token is rotated on every use. Replaying a revoked token
    revokes every session for that user, which is what a stolen token looks
    like.
  - A password reset is single-use and revokes all sessions when it is used.
- `JwtService` — HS256 access tokens carrying the email, the role and a token
  type, plus opaque refresh tokens that are stored only as a SHA-256 hash.
- `JwtAuthenticationFilter` — reloads the user from the database on every
  request and only authenticates an `ACTIVE` account, so a deactivated user
  loses access immediately rather than when their token expires.
- `SecurityConfig` — stateless, CSRF off, CORS from `APP_CORS_ALLOWED_ORIGINS`,
  and the secure headers (nosniff, SAMEORIGIN, referrer policy, a permissions
  policy that switches off camera, microphone, geolocation and payment).
  The 401 and 403 responses use the same `ApiError` envelope as every other
  error, so a client never has to parse two shapes.
- `CurrentUser` — resolves the authenticated principal to a user id.

**Still to do:** rate limiting on the auth and test-submit endpoints, and the
`MailSender` interface with its console implementation.

## Phase 4 — Passage bank and the attempt lifecycle

**Status: complete except the seeded content**

- `ExamProfile` and the `V2__seed_exam_profiles.sql` migration, which seeds 15
  profiles: SSC CHSL and CGL, court typist and junior assistant, RRB,
  stenographer, DEO (alphanumeric), Telugu, Kruti Dev and the generic
  practice profiles, each in English and Hindi where that applies. Every
  profile's `source_note` says the values are defaults and must be checked
  against the latest official notification.
- `AttemptService` — start, resume, submit.
  - The rules and the reference text are snapshotted onto the attempt when it
    starts, so a later edit to an exam profile cannot change how a finished
    test is scored.
  - The passage is picked at random from the ones that match the profile's
    language, with a fallback if there are none.
  - **The server recomputes every score.** It takes the raw typed text and the
    recorded timing events and runs them through the scoring engine. A
    client-computed WPM is never trusted.
  - The elapsed time is derived from the event offsets and capped at the
    attempt's duration, so a client cannot claim more time than the test
    allows.
  - The cheat log counts paste, drop, copy, context-menu and blur events.
- `AttemptController` — start, resumable list, resume, submit and result.
- `Passage` and `PassageRepository`, with the selection index on the
  `(language, exam_type, difficulty, active)` tuple.

**Still to do:** the seeded passage content (40 English, 30 Hindi, 20 Telugu,
15 alphanumeric — all original text) and the NFC/charset validation test
over it.

## Phase 6 — Keyboard layouts

Started early, alongside Phase 3, because the layouts decide what the
reference passages have to look like.

**Status: complete except the on-screen keyboard overlay**

- The `KeyboardLayout` abstraction: `id`, `label`, `language`, `description`,
  the key rows for the on-screen keyboard, `mapKey(event, state)` and
  `nextExpectedKey(reference, typed)`. A layout is data plus a small mapper,
  and nothing else in the application needs to change when one is added.
- Four layouts: English QWERTY, Hindi Inscript, Hindi Kruti Dev 010 (best
  effort, labelled as such) and Telugu Inscript.
- The shared Indic mapper in `indic.ts` implements the two rules that both
  Devanagari and Telugu need:
  - **The vowel rule.** A vowel key produces the dependent sign when a
    consonant precedes it and the independent vowel when it does not. Shift
    always forces the independent vowel.
  - **The conjunct rule.** Two consonants are joined with a halant when the
    passage writes them joined. See `DECISIONS.md` D18 for why the passage
    has to be consulted, and for the constraint that keeps the test honest.
- The Indic character tables are built from **code points**, not from
  literals, and `chars.test.ts` checks every one against its Unicode name.
  Devanagari and Telugu distinguish short and long vowels with glyphs that
  are nearly identical, so a literal that has been silently normalised is
  easy to miss and hard to spot in a diff. See `DECISIONS.md` D19.
- **497 frontend tests, all passing.** 90 mapping cases for English, 100 for
  Hindi Inscript, 90 for Telugu, 67 for Kruti Dev, plus 42 for the shared
  helpers, 32 for the registry and 76 for the character tables. Coverage over
  the keyboard module is 98.6% of lines and 100% of functions, against a 90%
  threshold.

**Three real bugs were found and fixed by these tests:**
1. The vowel keys produced the independent vowel when they should have
   produced the matra, so `क` + the `aa` key gave `कअ` instead of `का`.
2. The conjunct rule looked only at the last character, so a consonant that
   carried a matra could not start a conjunct. It now looks past the
   combining marks.
3. Kruti Dev consulted the structure before the passage, so an ambiguous key
   drew the wrong glyph when the two disagreed.

**Still to do:** the on-screen keyboard overlay component with the next-key
hint.

## Housekeeping

- Upgraded Vitest from 2 to 3. Vitest 2 bundles Vite 5 while the project
  uses Vite 6, which left two copies of Vite in the tree and made the
  `vitest.config.ts` types incompatible with the app's own Vite types. On
  Vitest 3 the dependency is deduplicated.

## Phase 4 (continued) — The seeded passage content

**Status: complete**

- **120 original passages**, all written for this project. Nothing is copied
  from an exam paper, a news article or a book.
  - 48 English, across easy, medium and hard
  - 36 Hindi
  - 21 Telugu
  - 15 alphanumeric, in the four-digit-group style the DEO tests use
- The passages live in plain UTF-8 files under `scripts/data/`, and
  `scripts/tools/PassageSqlGenerator.java` turns them into the Flyway
  migrations. The generator computes the character and word counts using
  the same `TextNormalizer` the application uses, so the database and the
  entity can never disagree about them.
- Writing the text in data files rather than inside SQL literals matters
  for the Indic scripts: a Devanagari or Telugu character in a SQL string
  can be mangled without anyone noticing, and the mangled version still
  looks plausible in a diff.
- `PassageSeedValidationTest` runs against a real PostgreSQL through
  Testcontainers and checks that the passages cover every language and
  every difficulty, that there are at least as many as the brief asks for,
  that every one is NFC-normalised and free of the replacement character,
  that the stored counts match the content, that the character ranges are
  the expected ones for each script, and that every passage says where it
  came from. **12 tests, all passing.**

**Three real bugs were found while wiring up the integration tests:**
1. `AppProperties` was never registered as a bean, so the application could
   not start at all. It had never been booted in a Spring context, because
   only the pure scoring module had been tested. Now
   `@EnableConfigurationProperties(AppProperties.class)` is on the
   application class.
2. The `LoggingMailSender` bean activates only when `app.mail.mode` is
   `console`, but the test profile set it to `log`, so the mail transport
   was missing and the context failed to load. The canonical value is
   `console` everywhere now.
3. Testcontainers 1.20.3 could not talk to the Docker Desktop daemon on
   this machine, because its bundled docker-java is too old for the
   29.6.1 API. Upgraded to Testcontainers 1.21.4, which works.

**77 backend tests pass in total** (65 scoring, 12 passage validation).
