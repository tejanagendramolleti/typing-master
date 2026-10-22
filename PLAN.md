# ExamTyper — Implementation Plan

Production web platform for Indian government exam typing practice & mock tests.
Target stack: **Java 21 / Spring Boot 3 / PostgreSQL / Flyway** + **React 18 / TS / Vite / Tailwind / TanStack Query / Recharts**,
packaged with **Docker Compose**, tested with **JUnit5 + Testcontainers + Vitest + Playwright**.

> Status legend: `[ ]` pending · `[~]` in progress · `[x]` done

---

## 0. Ground rules

- No question-asking. Ambiguity → decide, record in `DECISIONS.md`, continue.
- Never leave the repo broken. If a sub-task resists 3 attempts → `KNOWN_ISSUES.md` + best-effort fallback.
- Commit per phase. Tick `PLAN.md`. Append to `PROGRESS.md`.
- **No Razorpay / no real payment provider.** Provider-agnostic billing only.
- All seeded content is original text written for this project (no copyrighted papers).
- All external integrations (mail, AI, payments) have no-key mock implementations.

## 1. Repository layout

```
typing-master/
├─ backend/                     Spring Boot API (Maven, single module)
│  └─ src/main/java/com/examtyper/
│     ├─ common/                error envelope, request-id filter, pagination, JSON
│     ├─ config/                security, cache, openapi, jackson, scheduling
│     ├─ security/              JWT issue/verify, filters, role checks
│     ├─ user/                  users, roles, profile prefs, mail
│     ├─ exam/                  exam profiles (data-driven rules)
│     ├─ passage/               passage bank + selection
│     ├─ attempt/               attempt lifecycle, timing events, server verify
│     ├─ scoring/               ★ standalone scoring engine (pure, no Spring deps)
│     ├─ analytics/             trends, weak keys/words, drills
│     ├─ billing/               plans, orders, payments, subs, coupons, gateways
│     ├─ leaderboard/           weekly + all-time
│     ├─ admin/                 CRUD, import, KPIs
│     └─ reporting/             PDF report + certificate
├─ frontend/                    React SPA (Vite)
│  └─ src/
│     ├─ keyboard/              ★ layout abstractions + Inscript/KrutiDev/Telugu
│     ├─ features/              auth, exam, test, result, analytics, billing, admin
│     ├─ components/            design system
│     └─ lib/                   api client, query hooks
├─ e2e/                         Playwright specs
├─ scripts/                     env.sh, verify.sh, seed helpers
├─ docs/ADDING_RAZORPAY.md
├─ docker-compose.yml
└─ PLAN.md DECISIONS.md PROGRESS.md KNOWN_ISSUES.md THIRD_PARTY.md README.md DEPLOY.md
```

## 2. Data model (Flyway `V1__init.sql`)

`users`, `exam_profiles`, `passages`, `mock_tests`, `mock_test_passages`, `attempts`, `attempt_events`,
`plans`, `coupons`, `coupon_redemptions`, `orders`, `payments`, `subscriptions`, `invoices`,
`certificates`, `drills`, `waitlist`, `audit_log`.

Indexes on hot paths: `attempts(user_id, created_at)`, `attempts(exam_code, submitted_at)`,
`orders(user_id)`, `subscriptions(user_id, status)`, `passages(language, exam_type, difficulty)`.

## 3. Scoring engine contract

Pure module, zero Spring/JPA imports, table-driven tests.

- Gross WPM = `(typedChars / wordLengthChars) / minutes`
- Net WPM = gross − penalty(profile.errorModel, full, half)
  - `FULL_AND_HALF_MISTAKES` → `full*1.0 + half*0.5`
  - `PER_ERROR_PENALTY`    → `(full+half) * errorPenaltyPerUnit`
  - `ACCURACY_ONLY`        → `gross * accuracy`
- Word alignment = Levenshtein over words with backtrace → wrong / missing / extra.
- Per-pair refinement: case-only → `CASE` (half), punctuation-only → `PUNCTUATION` (half),
  whitespace-only → `SPACING` (half), else `WRONG` (full).
- Unicode: NFC-normalize both sides before comparison (NFC + NFD equivalence).
- Server recomputes everything from raw text + timing events. Client WPM is display-only.

## 4. Keyboard layout abstraction

`KeyboardLayout { id, label, mapKey(event, state) -> LayoutOutput }`
`LayoutOutput { text, consumed, nextHintKey, invalid }`

Layouts: `en-qwerty`, `hi-inscript`, `hi-krutidev`, `te-inscript`.
On-screen overlay renders the layout and highlights the expected next key.
≥30 mapping unit tests per layout.

## 5. Phases

### Phase 1 — Scaffold, Docker, DB, verify harness
- [x] Repo skeleton, `.gitignore`, `.editorconfig`, `.env.example`
- [x] Backend Maven project, Spring Boot 3.3.x, Java 21, dependencies
- [x] `application.yml` + profiles (dev/test/prod), env-driven
- [x] Flyway `V1__init.sql` (full schema + indexes)
- [x] `docker-compose.yml` (postgres, backend, frontend) + Dockerfiles
- [x] `scripts/verify.sh` harness (lint, backend test, frontend test, build, e2e) — non-zero on failure
- [x] Common: error envelope, request-ID filter, health/actuator

### Phase 2 — Scoring engine + exam profiles
- [x] `scoring` package (pure) + `ExamProfile` entity
- [x] Flyway seed of 7+ exam profiles
- [x] ≥40 table-driven scoring test cases
- [x] Server-side verification service

### Phase 3 — Auth, users, roles, security
- [x] Register / login / refresh / logout / password reset
- [x] JWT access+refresh, BCrypt, role-based access
- [x] Rate limiting on auth + submit, CORS via env, secure headers
- [x] `MailSender` interface + console implementation
- [x] Profile preferences (exam, language, target WPM)

### Phase 4 — Passage bank + attempt lifecycle
- [x] `passages` CRUD + selection service
- [x] Seed content: 40 EN / 30 HI / 20 TE / 15 alphanumeric
- [x] NFC + charset validation test over all seeded passages
- [x] Attempt start/submit/resume, timing events, anti-cheat log

### Phase 5 — Frontend shell + design system + English flow
- [x] Vite + React + TS + Tailwind + Router + TanStack Query
- [x] Design system (one accent, typography, spacing, light/dark)
- [x] Landing, catalog, pricing, FAQ, SEO pages
- [x] Test screen (passage, timer, live WPM, exam mode)
- [x] Result page (metrics, word diff, chart, error breakdown)

### Phase 6 — Keyboard layouts + on-screen keyboard
- [x] `en-qwerty`, `hi-inscript` (full), `te-inscript`, `hi-krutidev` (best-effort + documented)
- [x] On-screen keyboard overlay with next-key hint
- [x] ≥30 mapping tests per layout

### Phase 7 — Results, analytics, drills, PDF, certificates
- [x] WPM/accuracy trends, weak-key + weak-word analysis, missed words, time-of-day
- [x] Smart practice drill generator (algorithmic; `AI_ENABLED=false` mock LLM mode)
- [x] PDF result report + verifiable certificate (public verify URL)

### Phase 8 — Billing (provider-agnostic)
- [x] `PaymentGateway` interface: `createOrder`, `verifyPayment`, `handleWebhook`
- [x] `MockPaymentGateway` (dev only) + `ManualGateway` (UPI ref + admin approve)
- [x] Plans, coupons, orders, payments, subscriptions, invoices
- [x] Quota enforcement, server-side gating, idempotent activation, expiry job, renewal reminders
- [x] `PAYMENTS_MODE=disabled` → waitlist capture
- [x] `docs/ADDING_RAZORPAY.md`

### Phase 9 — Leaderboard, admin panel, import
- [x] Weekly + all-time leaderboards, privacy names, opt-out
- [x] Admin: passage/exam/plan/coupon CRUD, users, KPIs
- [x] CSV/JSON bulk import with validation + dry-run preview

### Phase 10 — E2E, polish, docs, final verification
- [x] 6 Playwright flows from the brief
- [x] Accessibility + responsive pass
- [x] `README.md`, `DEPLOY.md`, `THIRD_PARTY.md`, `DECISIONS.md`, `KNOWN_ISSUES.md`
- [x] `./scripts/verify.sh` fully green

### Phase 11 — The score the candidate is actually marked against
- [x] The accuracy floor is snapshotted onto the attempt and enforced (DECISIONS.md D21)
- [x] The submitted telemetry is checked for plausibility (DECISIONS.md D22)
- [x] The health endpoints are reachable without a session, and the probes exist
- [x] Both containers report themselves healthy, and stay healthy
- [x] The rate limits are configuration, not constants (DECISIONS.md D24)
- [x] The three demonstration accounts are created by the application (DECISIONS.md D26)
- [x] The on-screen keyboard shows the sign on the number row of the Indic layouts
- [x] The admin panel no longer takes the whole page down
- [x] A failure in the interface is shown, not a blank page
- [x] The end-to-end suite starts the whole application itself
- [x] `scripts/verify.sh` runs on a machine with no `JAVA_HOME` set


## 6. Definition of Done (from brief §9)

- [x] `docker compose up --build` runs the whole app (UI :3000, API :8080)
- [x] `./scripts/verify.sh` fully green
- [x] Free/Pro gating enforced server-side
- [x] EN, HI Inscript, HI Kruti Dev, TE Inscript work end-to-end with correct scoring
- [x] Mock + manual billing work; no Razorpay code; `docs/ADDING_RAZORPAY.md` written
- [x] Seed data validated; admin + demo accounts work
- [x] Docs complete and accurate
- [x] Clean git history, one commit per phase
