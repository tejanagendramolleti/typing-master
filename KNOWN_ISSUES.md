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

## 8. Known gaps still to be closed

These are tracked in `PLAN.md` and are not yet finished:

- Rate limiting on the auth and test-submit endpoints.
- The `MailSender` interface and its console implementation.
- The seeded passage content (40 English, 30 Hindi, 20 Telugu, 15
  alphanumeric) and the NFC/charset validation test over it.
- The frontend shell, the design system and the public pages.
- The on-screen keyboard overlay.
- Analytics, the smart drill generator, the PDF report and the certificate.
- Billing, the leaderboard and the admin panel.
- The Playwright end-to-end suite and `scripts/verify.sh`.
