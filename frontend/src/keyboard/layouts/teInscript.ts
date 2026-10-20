import type { KeyboardLayout } from '../types'
import { createIndicMapper, isTeluguConsonant, type IndicShiftKey } from '../indic'
import {
  TELUGU_ANUSVARA,
  TELUGU_AVAGRAHA,
  TELUGU_CHANDRABINDU,
  TELUGU_CONSONANTS,
  TELUGU_DANDA,
  TELUGU_VIRAMA,
  TELUGU_VISARGA,
  TELUGU_VOWELS,
} from '../chars'

/**
 * Telugu Inscript layout.
 *
 * Telugu works the same way as Hindi at the keyboard level: consonants on
 * the letter keys, vowels on the number row, and a conjunct formed by a
 * halant between two consonants.
 *
 * Two differences from Devanagari are worth knowing:
 *
 * - Telugu uses the **vattu** form, written with two halants, for a
 *   consonant that ends in a `y` sound. The layout reads the passage and
 *   inserts the right number of halants.
 * - Telugu keeps the short and long forms of `e` and `o` apart, so the
 *   vowel key produces a different sign depending on the passage.
 *
 * See `DECISIONS.md` D18 for why the conjunct rule reads the passage.
 */

/** The signs that stand on their own. */
const EXTRA_KEYS: Record<string, IndicShiftKey> = {
  Backquote: { unshifted: TELUGU_ANUSVARA, shifted: TELUGU_VISARGA },
  Backslash: { unshifted: TELUGU_VIRAMA, shifted: TELUGU_VIRAMA },
}

const mapper = createIndicMapper({
  virama: TELUGU_VIRAMA,
  consonants: TELUGU_CONSONANTS,
  vowelKeys: TELUGU_VOWELS,
  extraKeys: EXTRA_KEYS,
  isConsonant: isTeluguConsonant,
})

export const teInscriptLayout: KeyboardLayout = {
  id: 'te-inscript',
  label: 'తెలుగు (ఇన్‌స్క్రిప్ట్)',
  language: 'TE',
  description:
    'Vowels on the number row, consonants on the letter keys, conjuncts and vattu forms formed automatically.',

  rows: [
    {
      keys: [
        { code: 'Backquote', label: TELUGU_ANUSVARA, shiftLabel: TELUGU_VISARGA },
        { code: 'Digit1', label: 'అ', shiftLabel: 'ా' },
        { code: 'Digit2', label: 'ఆ', shiftLabel: 'ా' },
        { code: 'Digit3', label: 'ఇ', shiftLabel: 'ి' },
        { code: 'Digit4', label: 'ఈ', shiftLabel: 'ీ' },
        { code: 'Digit5', label: 'ఉ', shiftLabel: 'ు' },
        { code: 'Digit6', label: 'ఊ', shiftLabel: 'ూ' },
        { code: 'Digit7', label: 'ఏ', shiftLabel: 'ే' },
        { code: 'Digit8', label: 'ఐ', shiftLabel: 'ై' },
        { code: 'Digit9', label: 'ఒ', shiftLabel: 'ో' },
        { code: 'Digit0', label: 'ఓ', shiftLabel: 'ో' },
        { code: 'Minus', label: 'ఔ', shiftLabel: 'ౌ' },
        { code: 'Equal', label: 'అం', shiftLabel: 'అం' },
        { code: 'Backspace', label: '⌫', width: 2, modifier: true },
      ],
    },
    {
      keys: [
        { code: 'Tab', label: 'Tab', width: 1.5, modifier: true },
        { code: 'KeyQ', label: 'క' },
        { code: 'KeyW', label: 'ఖ' },
        { code: 'KeyE', label: 'గ' },
        { code: 'KeyR', label: 'ఘ' },
        { code: 'KeyT', label: 'ఙ' },
        { code: 'KeyY', label: 'చ' },
        { code: 'KeyU', label: 'ఛ' },
        { code: 'KeyI', label: 'జ' },
        { code: 'KeyO', label: 'ఝ' },
        { code: 'KeyP', label: 'ఞ' },
        { code: 'BracketLeft', label: 'ట' },
        { code: 'BracketRight', label: 'ఠ' },
        { code: 'Backslash', label: TELUGU_VIRAMA },
      ],
    },
    {
      keys: [
        { code: 'CapsLock', label: 'Caps', width: 1.75, modifier: true },
        { code: 'KeyA', label: 'డ' },
        { code: 'KeyS', label: 'ఢ' },
        { code: 'KeyD', label: 'ణ' },
        { code: 'KeyF', label: 'త' },
        { code: 'KeyG', label: 'థ' },
        { code: 'KeyH', label: 'ద' },
        { code: 'KeyJ', label: 'ధ' },
        { code: 'KeyK', label: 'న' },
        { code: 'KeyL', label: 'ప' },
        { code: 'Semicolon', label: 'ఫ' },
        { code: 'Quote', label: 'బ' },
        { code: 'Enter', label: '⏎', width: 2.25, modifier: true },
      ],
    },
    {
      keys: [
        { code: 'ShiftLeft', label: 'Shift', width: 2.25, modifier: true },
        { code: 'KeyZ', label: 'భ' },
        { code: 'KeyX', label: 'మ' },
        { code: 'KeyC', label: 'య' },
        { code: 'KeyV', label: 'ర' },
        { code: 'KeyB', label: 'ల' },
        { code: 'KeyN', label: 'వ' },
        { code: 'KeyM', label: 'శ' },
        { code: 'Comma', label: 'ష' },
        { code: 'Period', label: 'స' },
        { code: 'Slash', label: 'హ' },
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

export { TELUGU_CHANDRABINDU, TELUGU_DANDA, TELUGU_AVAGRAHA }
