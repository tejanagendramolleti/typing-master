/**
 * Shared helpers for the Indic keyboard layouts.
 *
 * Devanagari and Telugu behave the same way at the keyboard level:
 *
 * - A consonant key produces a consonant.
 * - A vowel key produces a **dependent vowel sign** (matra) when the sign
 *   can attach to the consonant before it, and an **independent vowel** when
 *   it cannot. Typing `क` then the `aa` key gives `का`, not `कअ`.
 * - When two consonants meet, the script may require a **halant** (virama)
 *   between them to form a conjunct: `क` + `्` + `त` is one written unit.
 *
 * The only script-specific part is the table of which characters exist and
 * which marks go with them. Everything else — in particular the vowel and
 * conjunct rules — is shared, so it lives here.
 */

import type { KeyEvent, LayoutOutput, LayoutState } from './types'
import { output } from './types'

/** The Devanagari halant / virama. */
export const DEVANAGARI_VIRAMA = '्'
/** The Devanagari nukta. */
export const DEVANAGARI_NUKTA = '़'
/** The Devanagari anusvara. */
export const DEVANAGARI_ANUSVARA = 'ं'
/** The Devanagari visarga. */
export const DEVANAGARI_VISARGA = 'ः'
/** The Devanagari chandrabindu. */
export const DEVANAGARI_CHANDRABINDU = 'ँ'
/** The Devanagari danda. */
export const DEVANAGARI_DANDA = '।'
/** The Devanagari avagraha. */
export const DEVANAGARI_AVAGRAHA = 'ऽ'

/** The Telugu virama. */
export const TELUGU_VIRAMA = '్'
/** The Telugu anusvara. */
export const TELUGU_ANUSVARA = 'ం'
/** The Telugu visarga. */
export const TELUGU_VISARGA = 'ః'
/** The Telugu chandrabindu. */
export const TELUGU_CHANDRABINDU = 'ఁ'
/** The Telugu danda. */
export const TELUGU_DANDA = '।'
/** The Telugu avagraha. */
export const TELUGU_AVAGRAHA = 'ఽ'

/** The code point of the first character of a string, or 0 when it is empty. */
export function codePointOf(character: string): number {
  if (!character) return 0
  return character.codePointAt(0) ?? 0
}

/** True when the character is a Devanagari consonant. */
export function isDevanagariConsonant(character: string): boolean {
  const code = codePointOf(character)
  if (code >= 0x0915 && code <= 0x0939) return true
  if (code >= 0x0958 && code <= 0x095f) return true
  if (code === 0x0979) return true
  return false
}

/** True when the character is a Telugu consonant. */
export function isTeluguConsonant(character: string): boolean {
  const code = codePointOf(character)
  return code >= 0x0c15 && code <= 0x0c39
}

/** True when the character is a Devanagari dependent vowel sign. */
export function isDevanagariMatra(character: string): boolean {
  const code = codePointOf(character)
  return code >= 0x093a && code <= 0x094c
}

/** True when the character is a Telugu dependent vowel sign. */
export function isTeluguMatra(character: string): boolean {
  const code = codePointOf(character)
  return code >= 0x0c3e && code <= 0x0c56
}

/** True when the character is a Devanagari independent vowel. */
export function isDevanagariIndependentVowel(character: string): boolean {
  const code = codePointOf(character)
  return code >= 0x0904 && code <= 0x0914
}

/** True when the character is a Telugu independent vowel. */
export function isTeluguIndependentVowel(character: string): boolean {
  const code = codePointOf(character)
  return code >= 0x0c04 && code <= 0x0c14
}

/**
 * Counts the halants (viramas) at the start of a string.
 *
 * Telugu uses two of them for the "vattu" form, so the count is not always
 * one.
 */
export function countViramas(text: string, virama: string): number {
  let count = 0
  while (text.startsWith(virama, count)) {
    count++
  }
  return count
}

/**
 * A vowel key.
 *
 * The key produces the dependent sign when the sign can attach to what came
 * before, and the independent vowel when it cannot. Holding shift forces the
 * independent vowel, which is the way to write a standalone vowel in the
 * middle of a word.
 */
export interface IndicVowelKey {
  /** The dependent vowel sign, which attaches to the preceding consonant. */
  matra: string
  /** The standalone vowel letter. */
  independent: string
}

/**
 * A key with two variants that the shift key picks between.
 */
export interface IndicShiftKey {
  /** What the key produces without shift. */
  unshifted: string
  /** What the key produces with shift. */
  shifted: string
}

/**
 * The shape of an Indic layout's character tables.
 */
export interface IndicTables {
  /** The halant that joins two consonants. */
  virama: string
  /** The consonant letters, by physical key code. */
  consonants: Record<string, string>
  /** The vowel keys, by physical key code. */
  vowelKeys: Record<string, IndicVowelKey>
  /** The signs that stand on their own, by physical key code. */
  extraKeys: Record<string, IndicShiftKey>
  /** True when the character is a consonant of this script. */
  isConsonant: (character: string) => boolean
}

/** The result of mapping a key in an Indic layout. */
export interface IndicMapper {
  mapKey(event: KeyEvent, state: LayoutState): LayoutOutput
  nextExpectedKey(reference: string, typed: string): string | null
}

/** Keys that the layout leaves to the browser. */
const CONTROL_KEYS = new Set([
  'Tab', 'Enter', 'Escape', 'ShiftLeft', 'ShiftRight',
  'ControlLeft', 'ControlRight', 'AltLeft', 'AltRight',
  'MetaLeft', 'MetaRight', 'CapsLock', 'ContextMenu',
])

/**
 * Matches any combining mark, in either Indic script.
 *
 * The matras, the halant, the nukta and the nasal signs are all combining
 * marks, so this covers every one of them.
 */
const COMBINING_MARK = /[\p{Mn}\p{Mc}\p{Me}]/u

/** True when the character is a combining mark. */
export function isCombiningMark(character: string): boolean {
  if (!character) return false
  return COMBINING_MARK.test(character)
}

/**
 * The last character that is not a combining mark.
 *
 * A consonant that carries a matra is still that consonant, so the rules
 * that ask "is there a consonant before this?" have to look past the
 * matra to find it.
 */
export function lastBaseCharacter(text: string): string {
  let index = text.length - 1
  while (index >= 0 && isCombiningMark(text[index])) {
    index--
  }
  return index >= 0 ? text[index] : ''
}

/**
 * Works out where the typed text sits in the reference text.
 *
 * In a well-behaved run the typed text is a prefix of the reference and the
 * offset is simply the typed length. When the candidate has made a mistake,
 * the two have drifted apart, so the longest matching suffix is used to find
 * a sensible position instead.
 *
 * @param reference the passage being typed
 * @param typed what the candidate has typed
 * @returns the index into the reference where the next character belongs
 */
export function alignOffset(reference: string, typed: string): number {
  if (!reference) return typed.length
  if (typed.length === 0) return 0
  if (reference.startsWith(typed)) return typed.length

  // Try progressively shorter suffixes of the typed text.
  const maxWindow = Math.min(24, typed.length)
  for (let window = maxWindow; window > 0; window--) {
    const suffix = typed.slice(typed.length - window)
    const index = reference.indexOf(suffix)
    if (index >= 0) {
      return index + suffix.length
    }
  }
  return typed.length
}

/**
 * Builds the mapper shared by the Devanagari and Telugu layouts.
 *
 * ## The conjunct rule is reference-guided
 *
 * A static table of "which consonant pairs join" cannot be correct on its
 * own, because Unicode encodes a joined pair as `C1` + halant + `C2` while
 * an unjoined pair is `C1` + `C2` — the two look identical until you know
 * which one the passage uses. The passage is right there on screen, so the
 * layout reads it.
 *
 * The reference is used for exactly one decision — whether a halant is needed
 * between two consonants. Which consonant a key produces is fixed by the
 * table and never depends on the reference, so the test still measures
 * typing and not copying. See `DECISIONS.md` D18.
 */
export function createIndicMapper(tables: IndicTables): IndicMapper {
  const { virama, consonants, vowelKeys, extraKeys } = tables

  const keyByCharacter = new Map<string, string>()
  const remember = (character: string, code: string) => {
    if (character && !keyByCharacter.has(character)) keyByCharacter.set(character, code)
  }
  for (const [code, character] of Object.entries(consonants)) remember(character, code)
  for (const [code, key] of Object.entries(vowelKeys)) {
    remember(key.matra, code)
    remember(key.independent, code)
  }
  for (const [code, key] of Object.entries(extraKeys)) {
    remember(key.unshifted, code)
    remember(key.shifted, code)
  }

  /**
   * The character the passage expects next, when the typed text still lines
   * up with it.
   *
   * Only a clean prefix is trusted. Once the candidate has made a mistake the
   * passage no longer says anything useful about the next character, so the
   * layout falls back to the structural rules.
   */
  function expectedCharacter(reference: string, typed: string): string | null {
    if (!reference || !reference.startsWith(typed)) return null
    let rest = reference.slice(typed.length)
    if (!rest) return null
    // A halant is inserted by the layout, not typed, so it is skipped.
    const viramas = countViramas(rest, virama)
    if (viramas > 0) {
      const after = rest.slice(viramas)
      if (after) rest = after
    }
    return rest[0] ?? null
  }

  return {
    mapKey(event: KeyEvent, state: LayoutState): LayoutOutput {
      if (event.code === 'Backspace') {
        return output('', { consumed: false })
      }
      if (CONTROL_KEYS.has(event.code)) {
        return { text: '', consumed: false, nextHintKey: null, invalid: false }
      }
      if (event.ctrlKey || event.metaKey || event.altKey) {
        return { text: '', consumed: false, nextHintKey: null, invalid: false }
      }

      if (event.code === 'Space') {
        return output(' ')
      }

      // ---- Signs that stand on their own --------------------------------
      if (event.code in extraKeys) {
        const key = extraKeys[event.code]
        return output(event.shiftKey ? key.shifted : key.unshifted)
      }

      // ---- Vowel keys -----------------------------------------------------
      if (event.code in vowelKeys) {
        const key = vowelKeys[event.code]
        const typedSoFar = state.text.slice(0, state.cursor)

        // Shift forces the standalone vowel.
        if (event.shiftKey) {
          return output(key.independent)
        }

        // The passage settles it when the typed text still lines up.
        const expected = expectedCharacter(state.reference ?? '', typedSoFar)
        if (expected === key.matra) {
          return output(key.matra)
        }
        if (expected === key.independent) {
          return output(key.independent)
        }

        // Otherwise the sign attaches when there is a consonant to attach to.
        const previous = lastBaseCharacter(typedSoFar)
        if (previous && tables.isConsonant(previous)) {
          return output(key.matra)
        }
        return output(key.independent)
      }

      // ---- Consonants -----------------------------------------------------
      if (event.code in consonants) {
        const character = consonants[event.code]
        const typedSoFar = state.text.slice(0, state.cursor)

        // The candidate typed a halant themselves — do not add a second one.
        const lastCharacter = typedSoFar.slice(-1)
        if (lastCharacter === virama) {
          return output(character)
        }

        // A conjunct is formed between two consonants. A consonant that
        // carries a matra still counts, so the look goes past the mark.
        const previous = lastBaseCharacter(typedSoFar)
        if (!previous || !tables.isConsonant(previous)) {
          return output(character)
        }

        const reference = state.reference
        if (!reference) {
          // Without a passage there is nothing to consult, so the consonant is
          // written on its own. This is the only sensible default.
          return output(character)
        }

        const offset = alignOffset(reference, typedSoFar)
        const rest = reference.slice(offset)
        const viramaCount = countViramas(rest, virama)
        if (viramaCount > 0) {
          const after = rest.slice(viramaCount)
          if (after.startsWith(character)) {
            return output(virama.repeat(viramaCount) + character)
          }
        }
        return output(character)
      }

      // Anything else (an IME, a dead key) falls back to the browser.
      if (event.key && event.key.length === 1) {
        return output(event.key)
      }
      return { text: '', consumed: false, nextHintKey: null, invalid: true }
    },

    nextExpectedKey(reference: string, typed: string): string | null {
      if (!reference) return null
      const offset = alignOffset(reference, typed)
      let rest = reference.slice(offset)
      if (!rest) return null

      // A halant in the passage is inserted by the layout, not typed, so the
      // hint skips it and points at the consonant that follows.
      const viramaCount = countViramas(rest, virama)
      if (viramaCount > 0) {
        const after = rest.slice(viramaCount)
        if (after) rest = after
      }

      const character = rest[0]
      if (character === ' ') return 'Space'
      return keyByCharacter.get(character) ?? null
    },
  }
}
