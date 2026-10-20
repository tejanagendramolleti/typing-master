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
