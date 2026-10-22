import type { KeyboardLayout } from '../types'
import { createIndicMapper, isDevanagariConsonant, type IndicShiftKey } from '../indic'
import {
  DEVANAGARI_ANUSVARA,
  DEVANAGARI_AVAGRAHA,
  DEVANAGARI_CHANDRABINDU,
  DEVANAGARI_CONSONANTS,
  DEVANAGARI_DANDA,
  DEVANAGARI_NUKTA,
  DEVANAGARI_VIRAMA,
  DEVANAGARI_VISARGA,
  DEVANAGARI_VOWELS,
} from '../chars'

/**
 * Hindi (Devanagari) Inscript layout.
 *
 * ## Design
 *
 * The layout follows the Inscript principle — a dedicated key row for vowels,
 * a phonetic key row for consonants, and a conjunct formed automatically when
 * two consonants are typed in sequence — with one important property: **the
 * text it produces is canonical Unicode**.
 *
 * That matters because the reference passages are ordinary Unicode
 * Devanagari. A layout that emitted a trailing virama on every consonant
 * (the "half-form" approach) would produce `क् द् त` for a passage written
 * as `कदत`, and the candidate would be marked wrong for typing correctly.
 *
 * So:
 *
 * - A consonant key emits the consonant in its **full** form.
 * - When a consonant key follows another consonant key **and the passage
 *   writes them joined**, a halant (virama, U+094D) is inserted between them,
 *   so `क` + `त` gives `क्त` exactly as Unicode writes it.
 * - The **number row** holds the vowels. The key produces the dependent sign
 *   (matra) when it can attach to the consonant before it, and the
 *   independent vowel when it cannot. Holding shift always forces the
 *   independent vowel.
 * - The explicit halant key produces a bare virama, for a conjunct that the
 *   layout should not form on its own; the shifted form produces the nukta.
 *
 * Because the output is canonical, the typed text compares equal to the
 * reference with no special-casing in the scoring engine.
 *
 * See `DECISIONS.md` D18 for why the conjunct rule reads the passage.
 */

/** The signs that stand on their own. */
const EXTRA_KEYS: Record<string, IndicShiftKey> = {
  Backquote: { unshifted: DEVANAGARI_ANUSVARA, shifted: DEVANAGARI_VISARGA },
  Backslash: { unshifted: DEVANAGARI_VIRAMA, shifted: DEVANAGARI_NUKTA },
}

const mapper = createIndicMapper({
  virama: DEVANAGARI_VIRAMA,
  consonants: DEVANAGARI_CONSONANTS,
  vowelKeys: DEVANAGARI_VOWELS,
  extraKeys: EXTRA_KEYS,
  isConsonant: isDevanagariConsonant,
})

export const hiInscriptLayout: KeyboardLayout = {
  id: 'hi-inscript',
  label: 'हिन्दी (इंस्क्रिप्ट)',
  language: 'HI',
  description:
    'Vowels on the number row, consonants on the letter keys, conjuncts formed automatically.',

  rows: [
    {
      keys: [
        { code: 'Backquote', label: DEVANAGARI_ANUSVARA, shiftLabel: DEVANAGARI_VISARGA },
        // The number row holds the vowels. The plain key writes the sign,
        // which attaches to the consonant before it, and the shifted key
        // writes the vowel on its own — so the cap shows the sign as the
        // main character and the standalone vowel as the small one.
        { code: 'Digit1', label: DEVANAGARI_VOWELS.Digit1.matra, shiftLabel: DEVANAGARI_VOWELS.Digit1.independent },
        { code: 'Digit2', label: DEVANAGARI_VOWELS.Digit2.matra, shiftLabel: DEVANAGARI_VOWELS.Digit2.independent },
        { code: 'Digit3', label: DEVANAGARI_VOWELS.Digit3.matra, shiftLabel: DEVANAGARI_VOWELS.Digit3.independent },
        { code: 'Digit4', label: DEVANAGARI_VOWELS.Digit4.matra, shiftLabel: DEVANAGARI_VOWELS.Digit4.independent },
        { code: 'Digit5', label: DEVANAGARI_VOWELS.Digit5.matra, shiftLabel: DEVANAGARI_VOWELS.Digit5.independent },
        { code: 'Digit6', label: DEVANAGARI_VOWELS.Digit6.matra, shiftLabel: DEVANAGARI_VOWELS.Digit6.independent },
        { code: 'Digit7', label: DEVANAGARI_VOWELS.Digit7.matra, shiftLabel: DEVANAGARI_VOWELS.Digit7.independent },
        { code: 'Digit8', label: DEVANAGARI_VOWELS.Digit8.matra, shiftLabel: DEVANAGARI_VOWELS.Digit8.independent },
        { code: 'Digit9', label: DEVANAGARI_VOWELS.Digit9.matra, shiftLabel: DEVANAGARI_VOWELS.Digit9.independent },
        { code: 'Digit0', label: DEVANAGARI_VOWELS.Digit0.matra, shiftLabel: DEVANAGARI_VOWELS.Digit0.independent },
        { code: 'Minus', label: DEVANAGARI_VOWELS.Minus.matra, shiftLabel: DEVANAGARI_VOWELS.Minus.independent },
        { code: 'Equal', label: DEVANAGARI_VOWELS.Equal.matra, shiftLabel: DEVANAGARI_VOWELS.Equal.independent },
        { code: 'Backspace', label: '⌫', width: 2, modifier: true },
      ],
    },
    {
      keys: [
        { code: 'Tab', label: 'Tab', width: 1.5, modifier: true },
        { code: 'KeyQ', label: 'क' },
        { code: 'KeyW', label: 'ख' },
        { code: 'KeyE', label: 'ग' },
        { code: 'KeyR', label: 'घ' },
        { code: 'KeyT', label: 'ङ' },
        { code: 'KeyY', label: 'च' },
        { code: 'KeyU', label: 'छ' },
        { code: 'KeyI', label: 'ज' },
        { code: 'KeyO', label: 'झ' },
        { code: 'KeyP', label: 'ञ' },
        { code: 'BracketLeft', label: 'ट' },
        { code: 'BracketRight', label: 'ठ' },
        { code: 'Backslash', label: DEVANAGARI_VIRAMA, shiftLabel: DEVANAGARI_NUKTA },
      ],
    },
    {
      keys: [
        { code: 'CapsLock', label: 'Caps', width: 1.75, modifier: true },
        { code: 'KeyA', label: 'ड' },
        { code: 'KeyS', label: 'ढ' },
        { code: 'KeyD', label: 'ण' },
        { code: 'KeyF', label: 'त' },
        { code: 'KeyG', label: 'थ' },
        { code: 'KeyH', label: 'द' },
        { code: 'KeyJ', label: 'ध' },
        { code: 'KeyK', label: 'न' },
        { code: 'KeyL', label: 'प' },
        { code: 'Semicolon', label: 'फ' },
        { code: 'Quote', label: 'ब' },
        { code: 'Enter', label: '⏎', width: 2.25, modifier: true },
      ],
    },
    {
      keys: [
        { code: 'ShiftLeft', label: 'Shift', width: 2.25, modifier: true },
        { code: 'KeyZ', label: 'भ' },
        { code: 'KeyX', label: 'म' },
        { code: 'KeyC', label: 'य' },
        { code: 'KeyV', label: 'र' },
        { code: 'KeyB', label: 'ल' },
        { code: 'KeyN', label: 'व' },
        { code: 'KeyM', label: 'श' },
        { code: 'Comma', label: 'ष' },
        { code: 'Period', label: 'स' },
        { code: 'Slash', label: 'ह' },
        { code: 'ShiftRight', label: 'Shift', width: 2.75, modifier: true },
      ],
    },
    {
      keys: [
        { code: 'ControlLeft', label: 'Ctrl', width: 1.25, modifier: true },
        { code: 'MetaLeft', label: 'Win', width: 1.25, modifier: true },
        { code: 'AltLeft', label: 'Alt', width: 1.25, modifier: true },
        { code: 'Space', label: 'Space', width: 6.25 },
        { code: 'AltRight', label: 'Alt', width: 1.25, modifier: true },
        { code: 'ContextMenu', label: 'Menu', width: 1.25, modifier: true },
        { code: 'ControlRight', label: 'Ctrl', width: 1.25, modifier: true },
      ],
    },
  ],

  mapKey: mapper.mapKey,
  nextExpectedKey: mapper.nextExpectedKey,
}

export { DEVANAGARI_CHANDRABINDU, DEVANAGARI_DANDA, DEVANAGARI_AVAGRAHA }
