/**
 * The characters the Indic layouts use, defined by code point.
 *
 * Devanagari and Telugu both distinguish a short vowel from a long one —
 * `े` (U+0947) from `ॆ` (U+0946) in Devanagari, `ే` (U+0C46) from `ే`
 * (U+0C47) in Telugu — and the two are near-identical on screen. Writing
 * them as literals is a reliable way to end up with the wrong one.
 *
 * So the tables are built from code points instead. A character is named
 * once, its code point is written out, and a unit test checks that the
 * result is the character the name claims to be.
 */

/** Builds a string from one or more code points. */
export function chars(...codes: number[]): string {
  return String.fromCodePoint(...codes)
}

// ---------------------------------------------------------------------------
// Devanagari
// ---------------------------------------------------------------------------

/** The Devanagari consonants, in keyboard order. */
export const DEVANAGARI_CONSONANTS = {
  KeyQ: chars(0x0915), // KA
  KeyW: chars(0x0916), // KHA
  KeyE: chars(0x0917), // GA
  KeyR: chars(0x0918), // GHA
  KeyT: chars(0x0919), // NGA
  KeyY: chars(0x091a), // CHA
  KeyU: chars(0x091b), // CHHA
  KeyI: chars(0x091c), // JA
  KeyO: chars(0x091d), // JHA
  KeyP: chars(0x091e), // NYA
  BracketLeft: chars(0x091f), // TTA
  BracketRight: chars(0x0920), // TTHA
  KeyA: chars(0x0921), // DDA
  KeyS: chars(0x0922), // DDHA
  KeyD: chars(0x0923), // NNA
  KeyF: chars(0x0924), // TA
  KeyG: chars(0x0925), // THA
  KeyH: chars(0x0926), // DA
  KeyJ: chars(0x0927), // DHA
  KeyK: chars(0x0928), // NA
  KeyL: chars(0x0929), // PA
  Semicolon: chars(0x092a), // PHA
  Quote: chars(0x092b), // BA
  KeyZ: chars(0x092c), // BHA
  KeyX: chars(0x092d), // MA
  KeyC: chars(0x092e), // YA
  KeyV: chars(0x092f), // RA
  KeyB: chars(0x0930), // LA
  KeyN: chars(0x0931), // VA
  KeyM: chars(0x0932), // SHA
  Comma: chars(0x0933), // SSA
  Period: chars(0x0934), // SA
  Slash: chars(0x0935), // HA
} as const

/** The Devanagari halant. */
export const DEVANAGARI_VIRAMA = chars(0x094d)
/** The Devanagari nukta. */
export const DEVANAGARI_NUKTA = chars(0x093c)
/** The Devanagari anusvara. */
export const DEVANAGARI_ANUSVARA = chars(0x0902)
/** The Devanagari visarga. */
export const DEVANAGARI_VISARGA = chars(0x0903)
/** The Devanagari chandrabindu. */
export const DEVANAGARI_CHANDRABINDU = chars(0x0901)
/** The Devanagari danda. */
export const DEVANAGARI_DANDA = chars(0x0964)
/** The Devanagari avagraha. */
export const DEVANAGARI_AVAGRAHA = chars(0x093d)

/**
 * The Devanagari vowel signs and their independent vowels.
 *
 * The sign attaches to the consonant before it; the independent letter
 * stands on its own.
 */
export const DEVANAGARI_VOWELS = {
  Digit1: { matra: chars(0x093e), independent: chars(0x0905) }, // AA / A
  Digit2: { matra: chars(0x093e), independent: chars(0x0906) }, // AA / AA
  Digit3: { matra: chars(0x093f), independent: chars(0x0907) }, // I
  Digit4: { matra: chars(0x0940), independent: chars(0x0908) }, // II
  Digit5: { matra: chars(0x0941), independent: chars(0x0909) }, // U
  Digit6: { matra: chars(0x0942), independent: chars(0x090a) }, // UU
  Digit7: { matra: chars(0x0947), independent: chars(0x090e) }, // E
  Digit8: { matra: chars(0x0948), independent: chars(0x0910) }, // AI
  Digit9: { matra: chars(0x094b), independent: chars(0x0912) }, // O
  Digit0: { matra: chars(0x094c), independent: chars(0x0914) }, // AU
  Minus: { matra: chars(0x0943), independent: chars(0x090b) }, // vocalic R
  Equal: { matra: chars(0x0944), independent: chars(0x090c) }, // vocalic RR
} as const

// ---------------------------------------------------------------------------
// Telugu
// ---------------------------------------------------------------------------

/** The Telugu consonants, in keyboard order. */
export const TELUGU_CONSONANTS = {
  KeyQ: chars(0x0c15), // KA
  KeyW: chars(0x0c16), // KHA
  KeyE: chars(0x0c17), // GA
  KeyR: chars(0x0c18), // GHA
  KeyT: chars(0x0c19), // NGA
  KeyY: chars(0x0c1a), // CHA
  KeyU: chars(0x0c1b), // CHHA
  KeyI: chars(0x0c1c), // JA
  KeyO: chars(0x0c1d), // JHA
  KeyP: chars(0x0c1e), // NYA
  BracketLeft: chars(0x0c1f), // TTA
  BracketRight: chars(0x0c20), // TTHA
  KeyA: chars(0x0c21), // DDA
  KeyS: chars(0x0c22), // DDHA
  KeyD: chars(0x0c23), // NNA
  KeyF: chars(0x0c24), // TA
  KeyG: chars(0x0c25), // THA
  KeyH: chars(0x0c26), // DA
  KeyJ: chars(0x0c27), // DHA
  KeyK: chars(0x0c28), // NA
  KeyL: chars(0x0c29), // PA
  Semicolon: chars(0x0c2a), // PHA
  Quote: chars(0x0c2b), // BA
  KeyZ: chars(0x0c2c), // BHA
  KeyX: chars(0x0c2d), // MA
  KeyC: chars(0x0c2e), // YA
  KeyV: chars(0x0c2f), // RA
  KeyB: chars(0x0c30), // LA
  KeyN: chars(0x0c31), // VA
  KeyM: chars(0x0c32), // SHA
  Comma: chars(0x0c33), // SSA
  Period: chars(0x0c34), // SA
  Slash: chars(0x0c35), // HA
} as const

/** The Telugu halant. */
export const TELUGU_VIRAMA = chars(0x0c4d)
/** The Telugu anusvara. */
export const TELUGU_ANUSVARA = chars(0x0c02)
/** The Telugu visarga. */
export const TELUGU_VISARGA = chars(0x0c03)
/** The Telugu chandrabindu. */
export const TELUGU_CHANDRABINDU = chars(0x0c01)
/** The Telugu danda. */
export const TELUGU_DANDA = chars(0x0964)
/** The Telugu avagraha. */
export const TELUGU_AVAGRAHA = chars(0x0c3d)

/**
 * The Telugu vowel signs and their independent vowels.
 *
 * Telugu keeps the short and long forms apart: the sign `ే` (U+0C46)
 * belongs with the letter `ఏ` (U+0C0E), and the sign `ే` (U+0C47) with
 * the letter `ఏ` (U+0C0F).
 */
export const TELUGU_VOWELS = {
  Digit1: { matra: chars(0x0c3e), independent: chars(0x0c05) }, // AA / A
  Digit2: { matra: chars(0x0c3e), independent: chars(0x0c06) }, // AA / AA
  Digit3: { matra: chars(0x0c3f), independent: chars(0x0c07) }, // I
  Digit4: { matra: chars(0x0c40), independent: chars(0x0c08) }, // II
  Digit5: { matra: chars(0x0c41), independent: chars(0x0c09) }, // U
  Digit6: { matra: chars(0x0c42), independent: chars(0x0c0a) }, // UU
  Digit7: { matra: chars(0x0c46), independent: chars(0x0c0e) }, // short E
  Digit8: { matra: chars(0x0c48), independent: chars(0x0c10) }, // AI
  Digit9: { matra: chars(0x0c4a), independent: chars(0x0c12) }, // short O
  Digit0: { matra: chars(0x0c4b), independent: chars(0x0c13) }, // long OO
  Minus: { matra: chars(0x0c4c), independent: chars(0x0c14) }, // AU
  Equal: { matra: chars(0x0c3e), independent: chars(0x0c05, 0x0c02) }, // A + anusvara
} as const
