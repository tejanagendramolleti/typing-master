# DECISIONS

Decisions taken while building ExamTyper, with the reasoning. Anything ambiguous
in the brief was resolved here rather than by interrupting the build.

---

## D1 — Accuracy is weighted and symmetric

**Decision.** Accuracy is `(correct + 0.5 × halfMistakes) / max(referenceWords, typedWords) × 100`.

**Why.** Two problems with the naive `correct / referenceWords`:
- Typing an extra word at the end of a perfect run would report **100% accuracy**,
  which is obviously wrong and would let a candidate buy accuracy by padding.
- A case slip and a wrong word would score identically, which is not how any
  Indian exam treats them — the full/half distinction exists precisely to
  separate them.

Weighting the denominator by the longer of the two lists makes extra words cost
exactly as much as skipped words, and the 0.5 credit makes a half mistake count
half as much as a wrong word. This also keeps the `ACCURACY_ONLY` error model
meaningful: the speed is scaled by the same ratio that is reported as accuracy.

## D2 — Word alignment is Levenshtein with a merge/split refinement pass

**Decision.** Align the typed and reference word lists with a Levenshtein
alignment over words, then run a second pass that recognises two reference words
typed as one (missing space) and one reference word typed as two (extra space),
converting both into a single `SPACING` half mistake.

**Why.** Positional comparison would mark every word after one skipped word as
wrong. Plain word-level Levenshtein fixes that but cannot see a missing space —
`quickbrown` instead of `quick brown` would read as one wrong word rather than
one spacing slip, and `qu ick` would read as two wrong words. The refinement
pass is a small, well-contained addition that gets both cases right.

The substitution cost is flat (1), so a correct word always aligns to a correct
word and a single insertion does not cascade.

## D3 — Combining marks are part of a word's identity

**Decision.** The comparison keys that strip punctuation keep Unicode combining
marks (`Mn`, `Mc`, `Me`), not just letters and digits.

**Why.** Devanagari and Telugu matras, viramas and nuktas are combining marks.
A key built on `Character.isLetterOrDigit` silently deletes them, so
`विद्यालय` (vidyalaya) and `विद्यालयी` (vidyalayii) would compare **equal**.
This was a real bug caught by the Hindi test cases.

## D4 — Exam rules live in the database, never in code

**Decision.** Every rule (duration, word length, error model, pass mark, backspace
policy, live-WPM visibility) is a column on `exam_profiles` and is snapshotted
onto the attempt row when the attempt starts.

**Why.** The brief requires it, and it is correct: official exam rules change
between notifications. The snapshot means that editing a profile later never
rewrites the score of a test that was already taken.

## D5 — Attempts store the reference text, not a passage reference alone

**Decision.** `attempts.reference_text` holds a copy of the passage as it was
when the attempt started.

**Why.** Passages are admin-editable. If a passage were edited or deactivated
mid-test, the stored result would no longer be reproducible. Copying the text
makes every stored score re-verifiable forever.

## D6 — The server recomputes every score

**Decision.** The client computes WPM only for the live display. The submitted
result is always recalculated server-side from the raw text plus the timing
events. The client's numbers are never stored.

**Why.** Required by the brief, and it is the only way the score can be trusted.
The server also derives the elapsed time from the recorded keystroke timestamps
rather than trusting a client-supplied duration.

## D7 — No payment provider SDK, even a mock one

**Decision.** `PaymentGateway` is an interface with three implementations
(`MockPaymentGateway`, `ManualGateway`, and a future `RazorpayGateway` that is
**not** written). No HTTP calls, no keys, no SDK.

**Why.** The brief forbids it explicitly. It also means the build has no
dependency that could phone home, and the whole billing flow is testable
offline. `docs/ADDING_RAZORPAY.md` describes the integration instead.

## D8 — `PAYMENTS_MODE` is a single env var with three values

**Decision.** `mock` | `manual` | `disabled`.

- `mock` — a dev-only "Pay (test)" button settles the order instantly. Disabled
  automatically when `APP_ENV=prod`.
- `manual` — the user submits a UPI transaction reference; an admin approves or
  rejects it, and approval activates the subscription. This lets the product take
  real money before any gateway exists.
- `disabled` — pricing CTAs are hidden and a waitlist capture is shown instead.

**Why.** One switch covers every stage of the product's life. The manual mode is
the important one: it is a working paid product with zero payment integration.

## D9 — Money is stored in paise (INTEGER)

**Decision.** All amounts are integer paise. No `FLOAT`, no `NUMERIC` for money.

**Why.** Floating point rounding on currency is a classic source of
off-by-one-paise reconciliation bugs between orders, payments and invoices.

## D10 — Free tier limit is 3 tests per day, counted server-side

**Decision.** The daily quota is enforced in the service layer against a
server-side count of the user's attempts, keyed by calendar day in the user's
timezone (default `Asia/Kolkata`).

**Why.** A client-side limit is not a limit. Counting server-side also means the
limit cannot be bypassed by clearing local storage.

## D11 — The manual gateway is a first-class order state machine

**Decision.** Order statuses are `CREATED → PENDING → AWAITING_REVIEW → APPROVED
| REJECTED`, alongside `PAID`, `FAILED`, `CANCELLED` and `EXPIRED`. Activation
is guarded by a database-level uniqueness constraint on the subscription's order
plus a transaction-level check, so the same order can never activate twice.

**Why.** "The same order cannot activate twice" is an explicit requirement, and
double activation is the kind of bug that only shows up under a concurrent
double-click. The unique constraint makes it impossible rather than unlikely.

## D12 — Certificate verification uses a public, unguessable certificate number

**Decision.** Certificates carry a certificate number (`ET-YYYY-XXXXXXXX`) and
are verifiable at a public URL that exposes only the holder's display name, the
exam, the score and the issue date.

**Why.** A certificate is worthless if it cannot be checked. The public endpoint
returns no email address and no account identifier, so a certificate can be
shared without leaking personal data.

## D13 — Fonts are bundled from Google Fonts, licences recorded

**Decision.** Noto Sans Devanagari, Noto Sans Telugu and Mukta are bundled as
self-hosted woff2 files. `THIRD_PARTY.md` records the SIL Open Font Licence for
each.

**Why.** The app must render Hindi and Telugu correctly on any machine, and a
webfont request to a third party would leak users' IPs and break offline use.

## D14 — Attempt timing uses server-recorded event timestamps

**Decision.** The client records a timestamp for every keystroke and posts them
as `attempt_events`. The server derives the elapsed time from the first and last
event, falling back to the attempt's `started_at` when there are no events.

**Why.** A client-supplied duration is trivially forged. Recorded events also
give the weak-key analysis its data, so the same telemetry serves two purposes.

## D15 — Java 21 and Node 22 are required

**Decision.** Java 21 (as specified) and Node 22 LTS.

**Why.** Java 21 is what the brief fixes. Node 22 is the current LTS and is what
the Docker images use, so local and container builds match.

## D16 — Local toolchain is bootstrapped by `scripts/env.sh`

**Decision.** The repository does not vendor a JDK or Maven. `scripts/env.sh`
discovers a JDK 21 and Maven 3.9 under `$TOOLS_DIR` (default `~/tools`) and puts
them on the `PATH`.

**Why.** Vendoring a ~200 MB JDK into the repository is unacceptable, and the
script keeps every build command identical whether it runs on a developer
machine or in CI. `TOOLS_DIR` can be overridden for other layouts.

## D17 — H2 is not used; Testcontainers PostgreSQL is the only integration DB

**Decision.** Integration tests run against a real PostgreSQL started by
Testcontainers.

**Why.** The application uses PostgreSQL-specific types and features (sequences,
`TIMESTAMPTZ`, partial indexes). Testing against H2 would let real bugs through
and would still not test the Flyway migrations against the real engine.

## D18 — The Indic layouts read the passage to decide whether a conjunct needs a halant

**Decision.** The Hindi and Telugu Inscript layouts, and the Kruti Dev
keystroke layer, receive the passage being typed as part of the typing state.
They consult it for exactly one decision: whether a halant belongs between
two consonants. Which consonant a key produces is fixed by a data table and
never depends on the passage.

**Why.** Unicode encodes a joined pair as `C1` + halant + `C2` and an unjoined
pair as `C1` + `C2`. The two are indistinguishable without the passage, and
the reference text is exactly the source of that information. A static table
of "which consonant pairs join" would have to be right for every possible
pair, which no table is.

**The constraint that keeps this honest.** The reference is used only to
decide *whether a joining mark is required*, never *which character a key
produces*. If the layout could read the next character straight out of the
passage, the test would measure copying rather than typing and the score
would be meaningless. The layout still has to know, unaided, which key
produces क, त, or भ. A candidate who does not know the layout will type
wrong, and the server will mark them wrong.

**Kruti Dev is different in kind.** Kruti Dev 010 is a font, not a keyboard.
The same byte draws a consonant in one place and a vowel sign in another,
and even a perfect run produces bytes that only render inside that font.
The layer here translates Kruti Dev keystrokes into canonical Unicode, which
means the output no longer needs the font — at the cost of the layout
reading the passage more often than the Inscript layouts do. The
limitations are listed in `KNOWN_ISSUES.md`.

## D19 — Indic character tables are built from code points, not from literals

**Decision.** The Devanagari and Telugu character tables are defined by
explicit code points, and a test checks every one of them against the
Unicode name it is supposed to have.

**Why.** Devanagari and Telugu distinguish short and long vowels with
glyphs that are nearly identical — `े` (U+0947) from `ॆ` (U+0946), `ే`
(U+0C47) from `ే` (U+0C46). A character written as a literal can be
silently normalised, autocorrected or mangled by a tool, and the result
still looks plausible in a diff. Writing `chars(0x0947)` says exactly what
is meant, and the name-checking test turns the table into something a
reviewer can verify without a Unicode reference at hand.

This applies to the tests as much as to the layouts. A test that hard-codes
the wrong literal is worse than no test, because it passes for the wrong
reason.

## D20 — The vowel key produces a dependent sign when it can attach, and shift forces the independent vowel

**Decision.** In the Inscript layouts, a vowel key produces the dependent
vowel sign (matra) when a consonant precedes it, and the independent vowel
letter when it does not. Holding the shift key always produces the
independent vowel.

**Why.** Typing `क` then the `aa` key must give `का`, not `कअ` — a
matra is a mark that attaches to the consonant before it, and there is no
way to know that intent without looking at what precedes. Shift is the
escape hatch for a standalone vowel in the middle of a word, which is rare
but real. The alternative — making the matra the shifted variant — reads
more naturally on a keyboard but gets `क` + `aa` wrong in the common case.

**Note.** The layout still consults the passage when the typed text and the
passage have drifted apart after a mistake, because the structural rule
alone cannot tell a matra from an independent vowel in that situation. The
consultation is bounded to that one decision, exactly as in D18.
