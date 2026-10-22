# ExamTyper

Typing practice and full-length mock tests for the Indian government
examinations that need a typist: SSC CHSL, SSC CGL, High Court typist and
junior assistant, Railway, stenographer, and the data entry operator tests.

Practice in English, Hindi and Telugu, with the keyboard layout each
examination actually uses. Every score is calculated on the server from the
text you typed and the timing recorded during the test.

---

## What it does

- **Full-length mock tests** for every exam — ten per exam, each made of
  several passages in sequence.
- **The real keyboard layouts.** English QWERTY, Hindi Inscript, Hindi
  Kruti Dev 010 and Telugu Inscript, with an on-screen keyboard that shows
  the next key to press.
- **Server-side scoring.** The browser sends what you typed and when each
  key was pressed; the server recomputes the speed, the accuracy and the
  mistakes. A client cannot report a speed it did not earn.
- **A pass is a pass.** The speed bar and the accuracy floor both have to be
  met, and both come from the exam profile — so a fast run with poor
  accuracy is not a pass.
- **Analytics that point somewhere.** Your speed and accuracy over time,
  the keys you are slow on, the words you miss most, and the hours of the
  day you type fastest. A drill built from the ones you actually get wrong.
- **Certificates and reports** when you pass a full-length mock.
- **A free tier** — three practice tests a day, counted on the server, in
  every language. No card.

## Running it

### With Docker Compose

The whole application — the database, the API and the interface — comes up
with one command.

```bash
git clone <this repository>
cd typing-master
cp .env.example .env
docker compose up --build
```

- The interface is on **http://localhost:3000**
- The API is on **http://localhost:8080**
- The API documentation is on **http://localhost:8080/swagger-ui**

The first start takes a few minutes: the images are built, PostgreSQL is
started, and the Flyway migrations seed the exam profiles, the passage bank
and the mock tests.

### Without Docker

You need Java 21, Maven 3.9 and Node 22.

```bash
# The backend
cd backend
mvn spring-boot:run

# The interface, in another terminal
cd frontend
npm install
npm run dev
```

The interface runs on http://localhost:5173 and proxies the API to
http://localhost:8080.

The backend needs a PostgreSQL. The quickest way is to run just the
database:

```bash
docker compose up -d postgres
```

Then set the environment:

```bash
export SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/examtyper
export SPRING_DATASOURCE_USERNAME=examtyper
export SPRING_DATASOURCE_PASSWORD=examtyper
export JWT_SECRET=change-this-to-something-at-least-32-characters-long
```

### The demo accounts

The application creates three accounts on start-up. They are for development
only.

| Account | Email | Password | What it is |
|---|---|---|---|
| Admin | `admin@examtyper.local` | `Admin@12345` | The admin panel |
| Free | `free@examtyper.local` | `Free@12345` | A candidate on the free tier |
| Pro | `pro@examtyper.local` | `Pro@12345` | A candidate with an active subscription |

The passwords come from `ADMIN_PASSWORD`, `DEMO_FREE_PASSWORD` and
`DEMO_PRO_PASSWORD`, and the seeding can be turned off entirely with
`SEED_DEMO_USERS=false`. An account that already exists is left alone, so
changing a password in the database is not undone by a restart.

## The environment

Everything is configured through the environment. `.env.example` has the
whole list; the ones that matter most are these.

| Variable | What it does | Default |
|---|---|---|
| `APP_ENV` | `dev`, `test` or `prod`. In `prod` the test payment gateway refuses to take a payment. | `dev` |
| `JWT_SECRET` | The signing key for the access tokens. At least 32 characters. | a development key |
| `APP_CORS_ALLOWED_ORIGINS` | The origins the API accepts, comma separated. | `http://localhost:3000` |
| `PAYMENTS_MODE` | `mock`, `manual`, `both` or `disabled`. See below. | `mock` |
| `MAIL_MODE` | `console` writes the emails to the log. | `console` |
| `AI_ENABLED` | Turns on the optional language-model drill phrasing. | `false` |
| `SPRING_DATASOURCE_URL` | The database. | the Docker Compose one |
| `FRONTEND_BASE_URL` | Where the links in the emails point. | `http://localhost:3000` |

### `PAYMENTS_MODE`

There is **no payment provider in this build**. There is no Razorpay code,
no Razorpay key and no Razorpay dependency. The billing layer is written
against a provider-neutral interface, so a real provider can be added later
without touching anything above it.

| Mode | What happens |
|---|---|
| `mock` | The candidate presses a "Pay (test)" button and the subscription is activated. Available in every environment except `prod`, where the gateway refuses. |
| `manual` | The candidate pays by UPI, gives the transaction reference, and an administrator approves it in the admin panel. A real workflow, with no provider. |
| `both` | Both of the methods are on offer and the candidate chooses one at the checkout. The end-to-end suite runs in this mode, because it drives both flows. |
| `disabled` | The pricing page shows a waitlist form instead of a checkout, and every order is refused. |

See [`docs/ADDING_RAZORPAY.md`](docs/ADDING_RAZORPAY.md) for how to add a
real provider when there is one to add.

## How it is put together

```
typing-master/
├─ backend/          Spring Boot API (Java 21, Maven)
│  └─ src/main/java/com/examtyper/
│     ├─ scoring/    the scoring engine — a pure module, no Spring
│     ├─ attempt/    starting, resuming and submitting a test
│     ├─ exam/       the exam profiles: the rules, as data
│     ├─ passage/    the passage bank
│     ├─ keyboard/   (the frontend's keyboard layer lives in the frontend)
│     ├─ user/       accounts, tokens, mail
│     ├─ billing/    plans, orders, subscriptions, the gateways
│     ├─ analytics/  the trends, the weak keys, the weak words
│     ├─ drills/     the smart drill and the passage generator
│     ├─ leaderboard/
│     ├─ reporting/  the PDF report and the certificate
│     ├─ admin/      the admin endpoints and the bulk import
│     └─ common/     the error envelope, the request id, the pagination
├─ frontend/         React interface (Vite, TypeScript, Tailwind)
│  └─ src/
│     ├─ keyboard/   the layout abstraction and the four layouts
│     ├─ features/   one folder per screen
│     ├─ components/ the design system
│     └─ lib/        the API client, the types, the session
├─ e2e/              the Playwright tests live in frontend/e2e/
├─ scripts/           the toolchain, the passage generator, verify.sh
└─ docs/              the guide to adding a payment provider
```

### The scoring engine

`backend/src/main/java/com/examtyper/scoring/` is a pure module with no
Spring dependency. It takes the reference text, what was typed, the rules
and the timing, and it produces the speed, the accuracy, the mistake counts
and the word-by-word diff.

It is the part of the application with the most tests, because it is the
part that decides whether a candidate is told the truth.

Three things about it are worth knowing:

- **The rules are data.** They come from the exam profile, not from the
  code. A new examination is a new row, not a new branch.
- **The word comparison is a Levenshtein alignment**, with a second pass
  that recognises a merged or a split word, so a missing space is a half
  mistake rather than two wrong words.
- **The accuracy is weighted and symmetric** — `(correct + 0.5 × half) /
  max(reference words, typed words)` — so that both a wrong word and an
  extra word count against the score.

And one thing about the attempt that decides the verdict:

- **The timing is checked for plausibility.** Recomputing the score stops a
  client from asserting a result; it does not stop a client from composing
  the telemetry. A submission whose recorded key presses could not have
  produced the text, or whose timings are faster than a person can type, is
  flagged and is not counted as a pass. See [`DECISIONS.md`](DECISIONS.md)
  D22.

### The keyboard layouts

`frontend/src/keyboard/` holds the abstraction and the four layouts. A
layout is data plus a small mapper:

```ts
interface KeyboardLayout {
  id: string
  mapKey(event: KeyEvent, state: LayoutState): LayoutOutput
  nextExpectedKey(reference: string, typed: string): string | null
}
```

The Indic layouts are **reference-guided**: when two consonants meet, the
layout checks the passage to see whether it writes them joined, and inserts
a halant if it does. The passage is used for that one decision only — which
key produces which consonant is fixed by a table, so the test still measures
typing rather than copying. See [`DECISIONS.md`](DECISIONS.md) D18.

The character tables are built from **code points**, not from literals, and
a test checks every code point against its Unicode name. Devanagari and
Telugu distinguish short and long vowels with glyphs that are nearly
identical, and a literal that has been silently normalised is easy to miss.

### The content

Every seeded passage is **original text written for this project**. Nothing
is copied from an exam paper, a news article or a book. There are 120 of
them: 48 English, 36 Hindi, 21 Telugu and 15 alphanumeric.

The passages live as plain UTF-8 files in `scripts/data/`, and
`scripts/tools/PassageSqlGenerator.java` turns them into the Flyway
migrations. The generator computes the character and word counts with the
same code the application uses, so the database and the entity can never
disagree about them.

`PassageSeedValidationTest` checks the result: that every passage is
NFC-normalised, that the counts match, that the character ranges are the
expected ones for each script, and that there are enough passages of each
language and difficulty.

## Running the tests

```bash
# Everything, in one command
./scripts/verify.sh

# The backend
cd backend && mvn test

# The interface
cd frontend && npm test

# The end-to-end tests
cd frontend && npx playwright test
```

`scripts/verify.sh` runs the lint, the backend tests, the interface tests,
the build and the end-to-end tests, and it exits non-zero if any of them
fail.

The end-to-end tests start the whole application themselves, with
`docker-compose.e2e.yml` laid over `docker-compose.yml`. The override
raises the rate limits, because every test registers a new candidate from
the same address, and it puts the application in `PAYMENTS_MODE=both`,
because the suite drives both payment flows. The ordinary deployment keeps
the limits in `docker-compose.yml` and the mode in `application.yml`.

The backend's integration tests need Docker, because they run against a
real PostgreSQL started by Testcontainers. The unit tests do not.

## Turning the language model on

The smart drill is **entirely algorithmic** — the words, the keys and the
lengths all come from the candidate's own history, and the default passage
generator is a template that needs no model, no key and no money.

The optional language-model mode changes one thing: the *prose* around the
difficult words. The `PassageGenerator` interface is the seam.

```bash
export AI_ENABLED=true
export AI_API_KEY=...        # only needed when the mode is on
export AI_MODEL=...          # the default is set in the application config
```

With the mode off — which is the default — everything works with no key and
no network.

## The documents

| Document | What it covers |
|---|---|
| [`PLAN.md`](PLAN.md) | The plan, the architecture and the phase checklist |
| [`DECISIONS.md`](DECISIONS.md) | Every design decision and why it was made |
| [`KNOWN_ISSUES.md`](KNOWN_ISSUES.md) | What this build does not do, and why |
| [`PROGRESS.md`](PROGRESS.md) | What has been built, phase by phase |
| [`THIRD_PARTY.md`](THIRD_PARTY.md) | The licences of the bundled assets |
| [`DEPLOY.md`](DEPLOY.md) | Putting it on a server |
| [`docs/ADDING_RAZORPAY.md`](docs/ADDING_RAZORPAY.md) | Adding a real payment provider |

## A note on the exam rules

The speeds, the durations and the way the mistakes are counted for each
examination are **defaults chosen to match the published pattern**. They
are close, but the official notification always wins. Every exam profile
carries a note saying so, and the rules live in the database so they can be
corrected without a deployment.

## The licence

The code is ours. The bundled fonts are not — see
[`THIRD_PARTY.md`](THIRD_PARTY.md) for their licences.
