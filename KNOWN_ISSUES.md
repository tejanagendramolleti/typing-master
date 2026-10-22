# Known issues and limitations

An honest list of what this build does not do, and why. Every item here is a
deliberate decision or a real limitation — not a note to self that was
forgotten.

---

## 1. Hindi Kruti Dev 010 is best-effort, not a faithful Kruti Dev

**Status:** shipped, labelled as best-effort in the layout picker and in the
exam profile.

**What the problem is.** Kruti Dev 010 is a *font*, not a keyboard. The bytes
a person types are not the characters they see; the font decides how to draw
them. Three things follow:

1. **The same byte means different things in different places.** The byte `k`
   draws the consonant न in one position and the long-ī matra ी in another.
   The byte `a` can draw अ, the matra ा, or the consonant ड. The layout
   cannot resolve this from the keystroke alone.
2. **A correct Kruti Dev run does not produce Unicode.** Even typed
   perfectly, the output is a legacy byte sequence that only renders
   correctly inside the Kruti Dev font.
3. **The `Ç` / `q` conventions, the `x` and `X` special forms, and the
   remapping rules for the rarer letters are not reproduced.**

**What this build does instead.** The `hi-krutidev` layout takes Kruti Dev
keystrokes and produces **canonical Unicode**, which is what the reference
passages are written in and what the scoring engine compares. To resolve the
ambiguity in (1), the layout consults the passage for the next character —
the same information a Kruti Dev user gets by looking at the text in front
of them.

**The trade-off.** A candidate who knows Kruti Dev but not this layout will
be slower than they would be in a real Kruti Dev environment, because the
output they are used to reading is not what they are producing. The
`hi-inscript` layout is the recommended one for new candidates.

**What would fix it properly.** A faithful Kruti Dev implementation would
either (a) render the reference text in a web font that uses the legacy
encoding and score on the raw bytes, or (b) implement the full Kruti Dev
remapping tables. (a) is not possible without bundling the Kruti Dev font,
which is not freely licensed. (b) is a large table and is out of scope for
this build.

---

## 2. The Indic layouts read the passage to place a halant

**Status:** shipped, and documented in `DECISIONS.md` D18.

**What it means.** A Devanagari or Telugu conjunct is written `C1` + halant +
`C2`, and an unjoined pair is written `C1` + `C2`. The two are
indistinguishable from the keystrokes alone, so the layout consults the
passage to decide whether a halant belongs between two consonants.

**The constraint that keeps this fair.** The passage is consulted for
*whether a joining mark is required* only. Which consonant a key produces
is fixed by a data table. A candidate who does not know the layout still
types the wrong key, and the server still marks them wrong — the score is
not inflated by the passage.

**Residual risk.** After the candidate makes a mistake, the typed text and
the passage have drifted apart, and the alignment between them is
approximate. The layout falls back to the structural rule in that case,
which is right most of the time and occasionally produces a halant that
should not be there. This affects at most one character per mistake.

---

## 3. The free tier allows three practice tests a day, counted server-side

**Status:** shipped.

**What it means.** The limit is three tests per calendar day across English
and one regional language, counted on the server from the `attempts` table.
The count resets at midnight in the server's time zone.

**Why it is worth saying.** A client-side counter can be cleared by clearing
local storage. This one cannot, because the server holds the record. The
trade-off is that the count is not per-device, so a candidate using two
browsers shares one allowance.

---

## 4. The weekly leaderboard uses the server's time zone for week boundaries

**Status:** shipped.

**What it means.** A "week" starts on Monday, midnight, in the server's
time zone (`APP_TIMEZONE`, default UTC). For a candidate in a different
zone the boundary is a few hours off from what they expect.

**Why.** Storing week boundaries per user would make the leaderboard
unfair: two candidates on opposite sides of the date line could never be on
the same board. One time zone for everyone is the fairer choice, even if the
boundary is not local midnight for everyone.

---

## 5. Certificates are verifiable, not signed

**Status:** shipped.

**What it means.** A certificate carries a unique, unguessable number and
has a public verification URL. The verification page shows whether a
number exists and what it says.

**What it does not do.** There is no cryptographic signature and no
certificate authority. Anyone with database access could mint a
certificate. For a practice platform, whose certificates are a
self-reported milestone rather than a qualification, this is adequate. A
real signature would need a signing key, a key-rotation story and a public
verification endpoint that does its own checking — a larger change than
this brief asks for.

---

## 6. The AI passage generator is a mock

**Status.** `AI_ENABLED=false` by default, and no API key is needed to run
the project.

**What it means.** The `PassageGenerator` interface has a mock
implementation that assembles passages from templates and the existing
passage bank. It is deterministic and free. The drill generator is purely
algorithmic and needs no LLM at all; the LLM mode is an optional addition
for drill *phrasing*, not for correctness.

**Why.** The brief requires every external integration to work in a mock
mode with no keys. A real LLM call would also make the product's core
feature — smart practice from weak keys and words — depend on a paid
service.

---

## 7. No real payment provider is integrated

**Status.** Deliberate, and required by the brief.

The billing layer is provider-agnostic. `MockPaymentGateway` (the default)
and `ManualGateway` (UPI reference plus admin approval) are implemented.
There is no Razorpay code, no Razorpay keys and no Razorpay dependency in
this repository. `docs/ADDING_RAZORPAY.md` explains how to add one later.

---

## 8. The telemetry check is a heuristic, not a proof

**Status:** shipped, and documented in `DECISIONS.md` D22.

**What it means.** Every submission is checked for two impossibilities: that
the recorded key presses could have produced the submitted text, and that
the attempt took long enough to have been typed at all. A submission that
fails is flagged `IMPOSSIBLE_TELEMETRY` and is not counted as a pass.

**What it does not do.** It does not prove that a result was genuinely
typed. A client that composes a plausible set of events — the right number
of key presses, at plausible times — is believed. The checks are built to
catch the crude forgeries, the ones a script produces, and the thresholds
are deliberately generous so that an honest candidate is never accused.

**Why the thresholds are where they are.** One key press is allowed to be
worth four code points, because in the Indic layouts a press can add a
virama and a consonant and a matra can add a fourth character. The speed
ceiling is a hundred code points a second, which is about six times the
world record for sustained typing.

**What would fix it properly.** A signed event stream would close it, but
it would need a key that the browser cannot read, which means a native
client. For a practice product, a heuristic that catches the crude
forgeries and never false-accuses an honest candidate is the right trade.

---

## 9. The rate limiter counts per instance, not per cluster

**Status:** shipped.

**What it means.** The buckets live in memory, so a deployment with more
than one instance allows each instance its own limit. The limit is
therefore looser than it looks from the outside.

**Why it is acceptable here.** The limits are on the authentication
endpoints and on the test submission. The authentication limits are there
to make guessing a password expensive, and the candidate's own account is
the thing being protected, so a per-instance limit still raises the cost
of an attack by the number of instances. A shared store would be the fix,
and it is a change of one class.

---

## 10. The attempts stored before the accuracy floor was enforced keep no floor

**Status:** shipped, and documented in `DECISIONS.md` D21.

**What it means.** The attempts that were taken before the floor was
snapshotted onto the attempt row keep the floor they were taken under,
which was none. They are not re-scored, because re-scoring them would
change a result the candidate has already been shown.

**Why it matters.** It means the stored history of a deployment that was
live before this change contains results that the current rules would not
produce. Every attempt taken after the change is marked against the floor
the exam asked for.


---

## 11. The UPI method needs a person, and only a person

**Status.** Shipped, and it works the way a manual approval is supposed to.

**What it means.** An order paid by the UPI method stays in
`AWAITING_REVIEW` until an administrator approves it. Nothing settles it
by itself, and no callback from a bank or a provider will arrive and
settle it, because there is no provider on the other end. A candidate who
pays at eleven at night waits until an administrator is awake.

**Why it is acceptable here.** It is the honest version of a manual
payment, and it is the flow an Indian candidate would recognise: a
reference is given, a person checks it, the access is turned on. The
alternative in this build would be a provider, and the brief rules one
out.

**What it costs.** The administrator's order list is the only place the
payment can be settled, so a deployment with nobody watching that list
will leave orders waiting. The list is a tab in the admin panel, and the
end-to-end suite drives it end to end, so it is not a screen that has
never been run.

---

## 12. The checkout offers what the deployment offers, and no more

**Status.** Shipped.

**What it means.** `PAYMENTS_MODE` decides which methods exist. In
`mock` the candidate sees only the test method; in `manual` only the UPI
method; in `both` the candidate chooses; in `disabled` there is no
checkout at all and the pricing page shows a waitlist form. The two
methods are settled by different paths, so an order made with the test
method cannot be settled by an administrator and an order made by UPI
cannot be settled by the test gateway. That is deliberate — the order
records what the candidate chose, and it is settled that way.

**Why it matters.** A deployment cannot offer a method it has no gateway
for, and a candidate cannot reach a method the deployment has switched
off. `PaymentGatewayRegistry` is the one place that decides, and every
gateway stays registered whatever the mode says, so switching the mode
never changes the wiring.
