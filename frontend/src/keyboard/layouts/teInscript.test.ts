import { describe, expect, it } from 'vitest'
import { teInscriptLayout } from './teInscript'
import { chars } from '../chars'
import { keyEvent, state } from '../../test/helpers'

/**
 * The Telugu characters are written as code points on purpose.
 *
 * Telugu distinguishes a short vowel from a long one with glyphs that look
 * almost identical, and a literal in the source can be silently normalised
 * into a different character. A code point is exactly the character it says
 * it is. `chars.test.ts` checks the code points against the Unicode names.
 */

/** The Telugu virama. */
const VIRAMA = chars(0x0c4d)
/** The Telugu anusvara. */
const ANUSVARA = chars(0x0c02)
/** The Telugu visarga. */
const VISARGA = chars(0x0c03)

/** KA, TA, LA, GA, SA — the consonants the word tests use. */
const KA = chars(0x0c15)
const TA = chars(0x0c24)
const LA = chars(0x0c30)
const GA = chars(0x0c17)
const SA = chars(0x0c34)
/** The AA matra. */
const AA_MATRA = chars(0x0c3e)
/** The short E matra, which is the one that follows a consonant. */
const E_MATRA = chars(0x0c46)

/**
 * Types a run of physical keys and returns the text produced.
 */
function type(codes: string[], reference?: string): string {
  let text = ''
  for (const code of codes) {
    const result = teInscriptLayout.mapKey(keyEvent(code), state(text, reference))
    text += result.text
  }
  return text
}

describe('teInscriptLayout', () => {
  describe('the consonant keys', () => {
    it.each([
      ['KeyQ', 0x0c15],
      ['KeyW', 0x0c16],
      ['KeyE', 0x0c17],
      ['KeyR', 0x0c18],
      ['KeyT', 0x0c19],
      ['KeyY', 0x0c1a],
      ['KeyU', 0x0c1b],
      ['KeyI', 0x0c1c],
      ['KeyO', 0x0c1d],
      ['KeyP', 0x0c1e],
      ['BracketLeft', 0x0c1f],
      ['BracketRight', 0x0c20],
      ['KeyA', 0x0c21],
      ['KeyS', 0x0c22],
      ['KeyD', 0x0c23],
      ['KeyF', 0x0c24],
      ['KeyG', 0x0c25],
      ['KeyH', 0x0c26],
      ['KeyJ', 0x0c27],
      ['KeyK', 0x0c28],
      ['KeyL', 0x0c29],
      ['Semicolon', 0x0c2a],
      ['Quote', 0x0c2b],
      ['KeyZ', 0x0c2c],
      ['KeyX', 0x0c2d],
      ['KeyC', 0x0c2e],
      ['KeyV', 0x0c2f],
      ['KeyB', 0x0c30],
      ['KeyN', 0x0c31],
      ['KeyM', 0x0c32],
      ['Comma', 0x0c33],
      ['Period', 0x0c34],
      ['Slash', 0x0c35],
    ])('maps %s to the expected consonant', (code, codePoint) => {
      const result = teInscriptLayout.mapKey(keyEvent(code), state(''))
      expect(result.text).toBe(chars(codePoint))
      expect(result.consumed).toBe(true)
      expect(result.invalid).toBe(false)
    })
  })

  describe('the vowel keys', () => {
    it.each([
      ['Digit1', 0x0c05],
      ['Digit2', 0x0c06],
      ['Digit3', 0x0c07],
      ['Digit4', 0x0c08],
      ['Digit5', 0x0c09],
      ['Digit6', 0x0c0a],
      ['Digit7', 0x0c0e],
      ['Digit8', 0x0c10],
      ['Digit9', 0x0c12],
      ['Digit0', 0x0c13],
      ['Minus', 0x0c14],
    ])('maps %s to the standalone vowel on its own', (code, codePoint) => {
      expect(teInscriptLayout.mapKey(keyEvent(code), state('')).text).toBe(chars(codePoint))
    })

    it.each([
      ['Digit1', 0x0c3e],
      ['Digit3', 0x0c3f],
      ['Digit4', 0x0c40],
      ['Digit5', 0x0c41],
      ['Digit6', 0x0c42],
      ['Digit7', 0x0c46],
      ['Digit8', 0x0c48],
      ['Digit9', 0x0c4a],
      ['Digit0', 0x0c4b],
      ['Minus', 0x0c4c],
    ])('maps %s to the matra after a consonant', (code, codePoint) => {
      expect(teInscriptLayout.mapKey(keyEvent(code), state(KA)).text).toBe(chars(codePoint))
    })

    it('maps shifted Digit3 to the standalone vowel even after a consonant', () => {
      expect(teInscriptLayout.mapKey(keyEvent('Digit3', { shiftKey: true }), state(KA)).text).toBe(
        chars(0x0c07),
      )
    })
  })

  describe('the sign keys', () => {
    it('maps the backquote key to the anusvara', () => {
      expect(teInscriptLayout.mapKey(keyEvent('Backquote'), state('')).text).toBe(ANUSVARA)
    })

    it('maps shifted backquote to the visarga', () => {
      expect(teInscriptLayout.mapKey(keyEvent('Backquote', { shiftKey: true }), state('')).text).toBe(VISARGA)
    })

    it('maps the backslash key to the virama', () => {
      expect(teInscriptLayout.mapKey(keyEvent('Backslash'), state('')).text).toBe(VIRAMA)
    })

    it('maps the space bar to a space', () => {
      expect(teInscriptLayout.mapKey(keyEvent('Space'), state('')).text).toBe(' ')
    })
  })

  describe('the conjunct rule', () => {
    it('joins two consonants when the passage writes them joined', () => {
      const result = teInscriptLayout.mapKey(keyEvent('KeyF'), state(KA, KA + VIRAMA + TA))
      expect(result.text).toBe(VIRAMA + TA)
    })

    it('keeps two consonants separate when the passage writes them separate', () => {
      const result = teInscriptLayout.mapKey(keyEvent('KeyF'), state(KA, KA + TA))
      expect(result.text).toBe(TA)
    })

    it('inserts two viramas for the vattu form', () => {
      // The vattu form is written with two halants.
      const text = type(['KeyQ', 'KeyF'], KA + VIRAMA + VIRAMA + TA)
      expect(text).toBe(KA + VIRAMA + VIRAMA + TA)
    })

    it('does not join across a space', () => {
      const result = teInscriptLayout.mapKey(keyEvent('KeyF'), state(KA + ' ', KA + ' ' + TA))
      expect(result.text).toBe(TA)
    })

    it('does not add a halant when the candidate typed one themselves', () => {
      const result = teInscriptLayout.mapKey(keyEvent('KeyF'), state(KA + VIRAMA, KA + VIRAMA + TA))
      expect(result.text).toBe(TA)
    })

    it('keeps the consonant on its own when there is no passage', () => {
      const result = teInscriptLayout.mapKey(keyEvent('KeyF'), state(KA))
      expect(result.text).toBe(TA)
    })

    it('joins a consonant that follows a matra', () => {
      const text = type(['KeyQ', 'Digit1', 'KeyQ', 'KeyF'], KA + AA_MATRA + KA + VIRAMA + TA)
      expect(text).toBe(KA + AA_MATRA + KA + VIRAMA + TA)
    })
  })

  describe('typing a whole word', () => {
    it('produces the exact Unicode for a joined word', () => {
      // TA + E matra + LA + VIRAMA + GA + U matra
      const text = type(
        ['KeyF', 'Digit7', 'KeyB', 'KeyE', 'Digit5'],
        TA + E_MATRA + LA + VIRAMA + GA + chars(0x0c41),
      )
      expect(text).toBe(TA + E_MATRA + LA + VIRAMA + GA + chars(0x0c41))
    })

    it('produces the exact Unicode for a word with an anusvara', () => {
      // SA + anusvara + TA
      const text = type(['Period', 'Backquote', 'KeyF'], SA + ANUSVARA + TA)
      expect(text).toBe(SA + ANUSVARA + TA)
    })
  })

  describe('the control keys', () => {
    it.each([
      'Tab',
      'Enter',
      'Escape',
      'ShiftLeft',
      'ShiftRight',
      'ControlLeft',
      'ControlRight',
      'AltLeft',
      'AltRight',
      'MetaLeft',
      'MetaRight',
      'CapsLock',
      'ContextMenu',
    ])('leaves %s to the browser', (code) => {
      const result = teInscriptLayout.mapKey(keyEvent(code), state(''))
      expect(result.consumed).toBe(false)
      expect(result.text).toBe('')
    })

    it('leaves Backspace to the typing area', () => {
      expect(teInscriptLayout.mapKey(keyEvent('Backspace'), state(KA)).consumed).toBe(false)
    })
  })

  describe('nextExpectedKey', () => {
    it('points at the consonant key for the next character', () => {
      expect(teInscriptLayout.nextExpectedKey(KA + TA, '')).toBe('KeyQ')
    })

    it('points at the space bar for a space', () => {
      expect(teInscriptLayout.nextExpectedKey(KA + ' ' + TA, KA)).toBe('Space')
    })

    it('points at the matra key for a matra', () => {
      expect(teInscriptLayout.nextExpectedKey(KA + AA_MATRA, KA)).toBe('Digit1')
    })

    it('skips the virama that the layout inserts itself', () => {
      expect(teInscriptLayout.nextExpectedKey(KA + VIRAMA + TA, KA)).toBe('KeyF')
    })

    it('skips two viramas in the vattu form', () => {
      expect(teInscriptLayout.nextExpectedKey(KA + VIRAMA + VIRAMA + TA, KA)).toBe('KeyF')
    })

    it('returns null when the passage is exhausted', () => {
      expect(teInscriptLayout.nextExpectedKey(KA, KA)).toBeNull()
    })
  })

  describe('the layout metadata', () => {
    it('is identified as the Telugu layout', () => {
      expect(teInscriptLayout.id).toBe('te-inscript')
      expect(teInscriptLayout.language).toBe('TE')
    })

    it('has five rows of keys', () => {
      expect(teInscriptLayout.rows).toHaveLength(5)
    })
  })
})
