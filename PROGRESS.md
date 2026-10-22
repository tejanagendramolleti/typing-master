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

## Phase 5 — The frontend shell, the design system and the public pages

**Status: complete**

- The application shell: Vite + React 18 + TypeScript + Tailwind + Router +
  TanStack Query, with the routes for every page.
- The design system, in `src/styles/index.css`:
  - **One accent colour**, the indigo-leaning violet in the Tailwind config.
    Everything else is a neutral, so the numbers stay the loudest thing on
    the screen.
  - The three result states — good, warn, bad — are reserved for the score
    and are never used for decoration.
  - A visible focus ring on every interactive element, because the browser
    default disappears against the dark surfaces.
  - `prefers-reduced-motion` is honoured.
- The public pages: the landing page, the exam catalogue with a language
  filter and a search, the detail page for one exam with its rules, the
  pricing page with a waitlist capture when payments are off, the FAQ, the
  sign-in and registration pages, the password reset, and the certificate
  verification page.
- The typing screen:
  - The passage at the top with the candidate's progress shown in place.
  - The typing area below it, with autocorrect, spellcheck and
    autocapitalise all switched off.
  - The clock, the live speed and the submit button in the top bar.
  - A full-screen exam mode.
  - Paste, drop, copy and the context menu are blocked, and each attempt is
    recorded against the test. Leaving the tab is recorded too.
  - The test submits itself when the time runs out.
- The result page: the verdict, the six headline numbers, the word-by-word
  diff with the error types colour-coded, the error breakdown as a chart,
  and the keystroke counts.
- The dashboard, the analytics page with the speed and accuracy trends, the
  weak-key chart, the weak words and the performance by hour of the day.
- The profile page, the admin panel and the certificate verification page.
- The API client refreshes an expired access token once, and shares a
  single refresh between the callers that arrive while one is running — a
  page that fires five requests must not send five refreshes, because the
  rotation would invalidate four of the new tokens.

**The lint configuration was missing entirely**, so `npm run lint` had
never run. It is now an ESLint 9 flat config with the React and TypeScript
rules, and the whole tree passes with `--max-warnings=0`.

497 frontend tests pass. The type check is clean and the production build
succeeds.

## The frontend test suite

**Status: complete for the parts that are built**

- The keyboard mappers: 497 tests, 98.6% of lines and 100% of functions over
  the keyboard module, against a 90% threshold.
- The typing hook: 20 tests covering the typed text, the keystroke and
  backspace counts, the recorded events, the expiry, and the fact that the
  layout is given the passage so it can form a conjunct.
- The word comparison: 11 tests.
- The result page: 15 tests covering the verdict, the six numbers, the
  diff, the breakdown, the cheat flag and the certificate.
- The dashboard: 10 tests covering the daily allowance and the paywall —
  the upgrade prompt appears when the three free tests are spent, does not
  appear for a Pro member, and the Pro member is labelled as such.

**553 frontend tests pass in total.**

**Two things about the test setup were wrong and are now fixed:**
1. `vi.restoreAllMocks()` was called in the shared `afterEach`. It resets
   the implementation of every mock, including the ones a test file
   installs with `vi.mock`, so the second test in a file found its stubs
   returning nothing. It is now `vi.clearAllMocks()`, which clears the
   calls but keeps the implementations.
2. A component that reads `useParams` needs a matching `Route`, not just
   a `MemoryRouter` — the params come from the route pattern. The shared
   `renderWithProviders` helper does this now, so a test cannot get it
   wrong by accident.

The `vi.mock` factory is also hoisted above the imports, so a stub that
reads a module-level variable has to use `vi.hoisted` or it reads the
variable before it is assigned.

## Phase 8 — The provider-agnostic billing layer, the quota and the rate limiter

**Status: complete**

- `PaymentGateway` — `createOrder`, `verifyPayment` and `handleWebhook`,
  with provider-neutral results. Everything above it is written against the
  interface, so a real provider can be added later without changing a line.
- Three implementations: `MockPaymentGateway` (the default), `ManualGateway`
  (the candidate pays by UPI and an administrator approves) and
  `DisabledPaymentGateway` (which refuses, so the wiring never depends on
  the configuration).
- The `MockPaymentGateway` refuses to take a payment when `APP_ENV` is
  `prod`, whatever the configuration says, so a production deployment left in
  mock mode refuses rather than giving a subscription away.
- The order state machine: create, pay, approve, reject, expire. The
  activation is idempotent — the subscription is looked up by its order
  before one is made, so approving an order twice gives one subscription and
  not two.
- Coupons with a percentage or a flat discount, a minimum order, a total
  redemption limit, a per-user limit and an expiry.
- Money is in paise throughout, never a fraction.
- The plans are seeded in the database, so a price can be changed without a
  deployment.
- The free tier allows three tests a day, counted on the server from the
  `attempts` table. The check happens in `AttemptService.start`, before a
  passage is picked. `SubscriptionService.requirePro` is the server-side
  gate for the Pro features — the interface hides a Pro feature, this is
  what stops it.
- The rate limiter is a token bucket on the authentication endpoints and on
  the test submission endpoint, keyed by the signed-in user where there is
  one and by the address otherwise. The 429 response uses the same error
  envelope as every other error. The forwarding header is only believed
  outside production, because a client that could set it could dodge the
  limit.

## Phase 7 and 9 — The analytics, the leaderboard, the drill, the certificates and the admin panel

**Status: complete**

- The analytics: the speed and accuracy trends, the weak keys, the weak
  words and the performance by hour of the day. The word-level analysis is
  recomputed from the stored text with the same engine that scored the
  attempt, so the diff always agrees with the score.
- The leaderboard: the weekly and the all-time board, per exam. A candidate
  who has opted out is not on the board at all. A candidate with no display
  name is shown by the first part of their email address, and the email
  itself is shown only when the candidate has asked for it.
- The smart drill, built from the candidate's own weak words and weak keys.
  The `PassageGenerator` interface has a template implementation that needs
  no model, no key and no money, and a real one can be added later without
  changing the drill logic.
- The certificates and the reports: a certificate is issued when a
  full-length mock is passed, the number is long and unguessable, and the
  alphabet leaves out the letters that are easy to confuse. The PDF
  certificate, the downloadable result report and the public verification
  page, which needs no account.
- The admin panel: the passage bank, the exam profiles, the plans and the
  summary figures, and the bulk import of passages in JSON or CSV with a
  preview that says what would happen before anything is done.

## Phase 10 — The mocks, the documentation and the end-to-end suite

**Status: complete**

- Ten full-length mocks for every exam, each made of five passages. The
  rules for a mock are copied from its exam profile, so a mock and a
  practice test for the same exam are scored the same way. The mocks walk
  through the passage pool, so two mocks do not share their passages in the
  same order.
- The six end-to-end flows the brief asks for: register and take a test, hit
  the free limit, upgrade with the test gateway and see the analytics, the
  manual UPI request approved by an administrator, the Hindi Inscript test
  with simulated key events, the administrator adding a passage, and the
  anti-cheat measures. The tests share one database, so they run one at a
  time.
- `README.md`, `DEPLOY.md`, `THIRD_PARTY.md` and `docs/ADDING_RAZORPAY.md`.
  The Razorpay document is a guide only — there is still no Razorpay code,
  no key and no dependency.
- `scripts/verify.sh` — the whole check, exiting non-zero on any failure,
  with `--no-e2e` and `--fast` for the shorter runs.

## Phase 11 — The score the candidate is actually marked against

**Status: complete**

This phase fixes a real hole in the scoring, and it was found by reading the
path a result takes rather than by a failing test.

- **The accuracy floor was never enforced.** The exam profile has always
  carried a `min_accuracy_pct` — 90 for SSC CHSL, and a floor for every
  profile. The interface shows it on the exam page, the result page says
  "you cleared the speed bar and the accuracy floor", and the certificate
  rule reads it. But the snapshot of the rules on the attempt row had the
  passing speed and not the accuracy, and `AttemptService.submit` built the
  scoring rules with a hard-coded zero for the floor. So the floor was
  always zero, the accuracy was never checked, and a candidate who typed
  for two seconds and submitted was told they had passed: the elapsed time
  is short, so the gross speed is enormous, and nothing was standing in
  the way.
  - `V9__add_attempt_min_accuracy.sql` adds the column to `attempts`.
    The attempts that are already stored keep the floor they were taken
    under, which was none — re-scoring them would change a result the
    candidate has already been seen.
  - `Attempt` carries the floor, `AttemptService.start` copies it from the
    profile and `AttemptService.submit` scores against the snapshot, not
    against the profile.
  - The floor is now in the response, so the test screen shows the bar the
    candidate is being marked against, and the result page says which bar
    they reached.
- **The telemetry a client sends is now checked for plausibility.** The
  server recomputing the score (D6) stops a client from *asserting* a
  result; it does not stop a client from *composing* the telemetry. A client
  that posts the whole passage and a single event with an offset of one
  millisecond would have been believed, and it would have posted a speed of
  twenty thousand words a minute. `AttemptIntegrity` now checks that the
  recorded key presses could have produced the text and that the time was
  long enough to have typed it. A submission that fails is flagged
  `IMPOSSIBLE_TELEMETRY` and is not counted as a pass. See `DECISIONS.md`
  D21 and D22.
- **The health endpoints were behind the authentication.** The container's
  health check and any monitor use `/actuator/health`, and neither has a
  session, so the health check was failing and the readiness probe did not
  exist. The endpoints are now permitted, the probe groups are switched on,
  and the mail indicator is off unless an SMTP host is configured — there is
  no SMTP server in the default deployment, and the indicator would have
  reported the whole application as unhealthy.
- **The web container's health check was addressing the wrong loopback.**
  Both images check themselves over `localhost`, and in the Alpine-based
  web image `localhost` resolves to the IPv6 loopback first. nginx listens
  only on IPv4, so the check was refused and the container sat in
  `unhealthy` while serving the site perfectly well. Both health checks
  now name `127.0.0.1`.
- **A resumed attempt was getting a fresh clock.** The server derives the
  elapsed time from the recorded event offsets, and it trusts them because
  they are harder to forge than a duration. But the offsets after a page
  reload were measured from that reload, so a candidate could type for a
  while, reload, and type the passage again with the count starting from
  zero — and the server would have seen a short, fast attempt. The client
  now measures its offsets from the start of the attempt, using the
  server's own timestamps, and the time left on the clock is the time that
  is really left. See `DECISIONS.md` D23.
- **`scripts/verify.sh` died before it started.** The script runs with
  `set -u`, and `scripts/env.sh` tested `$JAVA_HOME` and `$M2_HOME`
  unbound, so on a machine where neither was set the harness exited with an
  unbound-variable error instead of running the checks. Both tests are now
  in the `${VAR:-}` form.
- **The rate limits were constants.** The limits on registration, on
  login, on the password reset and on the submission endpoint were written
  into the filter. That is right for a deployment on the internet and
  wrong for a test run, where every test registers a new candidate from the
  same address and the suite spends most of its time being told to slow
  down. The limits are read from the configuration now, with the same
  defaults in the code, and the end-to-end suite raises them in its own
  Compose override. See `DECISIONS.md` D24.
- **The demonstration accounts were promised and never created.** The
  README had listed three accounts — an administrator, a free candidate and
  a candidate with a Pro subscription — and nothing created them, so the
  administrator could not sign in to a fresh deployment, and the
  end-to-end suite, which signs in as the administrator, could not run
  either. `DemoUserSeeder` creates them when the application starts, leaves
  an account that already exists exactly as it is, and can be turned off
  with `SEED_DEMO_USERS=false`. See `DECISIONS.md` D26.
- **The admin panel took the whole application down.** The passages
  endpoint returns a Spring `Page`, and the interface treated it as an
  array. `TypeError: c.map is not a function` in the passages table
  unmounted the React tree, so the administrator was left with a blank page
  and the end-to-end run reported that the element "was detached from the
  DOM". The query is typed as a page now, and the table reads `content`.
  The toggle used the wrong verb as well — the endpoint is a `PATCH` and
  the interface posted it — so there is a `patch` in the API client now.
- **A render error was a blank page.** An error in a component takes the
  tree down with it, and the reader gets an empty window and no way back.
  `ErrorBoundary` now catches it, says what happened, and offers a retry.
- **The on-screen keyboard promised the wrong character on twelve keys.**
  In the Indic layouts the number row holds the vowels: the plain key
  writes the sign that attaches to the consonant before it, and the
  shifted key writes the vowel on its own. The caps had them the other way
  round, so the keyboard showed the independent vowel where the sign
  belongs. The caps now show the sign as the main character and the
  standalone vowel as the small one, in both layouts.
- **The end-to-end suite could not start the application itself.** The
  Playwright configuration started the stack with `docker compose up`, and
  the rate limits that suit a real deployment stopped the suite halfway
  through. The stack is now started by a global setup that lays
  `docker-compose.e2e.yml` over `docker-compose.yml` — which raises the
  limits and changes nothing else — whether or not a stack is already
  running.

**15 new backend tests** — 9 for the integrity checks and 6 for the attempt
lifecycle against a real PostgreSQL, including the run that clears the speed
bar and still fails the accuracy floor, and the forged run that is flagged.

**8 new interface tests** — for the resumed attempt's clock, the number row
of the two Indic layouts, and the result page's account of a flagged
attempt.
