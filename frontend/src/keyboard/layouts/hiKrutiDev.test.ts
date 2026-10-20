import { describe, expect, it } from 'vitest'
import { hiKrutiDevLayout } from './hiKrutiDev'
import { chars } from '../chars'
import { keyEvent, state } from '../../test/helpers'

/**
 * The Devanagari characters are written as code points on purpose — see
 * `chars.test.ts` for why.
 */

/** The Devanagari halant. */
const VIRAMA = chars(0x094d)
/** KA, TA, RA, MA, BA, DA — the consonants the word tests use. */
const KA = chars(0x0915)
const TA = chars(0x0924)
const RA = chars(0x092f)
const MA = chars(0x092d)
const BA = chars(0x092b)
const DA = chars(0x0926)
/** The AA matra and the AA vowel letter. */
const AA_MATRA = chars(0x093e)
const AA_VOWEL = chars(0x0906)
/** The I matra and the short E matra. */
const I_MATRA = chars(0x093f)
const E_MATRA = chars(0x0946)
/** The A vowel letter. */
const A_VOWEL = chars(0x0905)
/** The E vowel letter and the GA consonant. */
const E_VOWEL = chars(0x090e)
const GA = chars(0x0917)

/**
 * Types a run of physical keys and returns the text produced.
 *
 * @param codes the keys, each either a code or a code with modifiers
 * @param reference the passage being typed, when the layout needs it
 */
function type(
  codes: (string | [string, { shiftKey?: boolean }])[],
  reference?: string,
): string {
  let text = ''
  for (const entry of codes) {
    const [code, options] = Array.isArray(entry) ? entry : [entry, {}]
    const result = hiKrutiDevLayout.mapKey(keyEvent(code, options), state(text, reference))
    text += result.text
  }
  return text
}

describe('hiKrutiDevLayout', () => {
  describe('the keys with one meaning', () => {
    it.each([
      ['KeyQ', 0x0915],
      ['KeyW', 0x0916],
      ['KeyR', 0x0918],
      ['KeyT', 0x0919],
      ['KeyY', 0x091a],
      ['KeyU', 0x091b],
      ['BracketLeft', 0x091f],
      ['BracketRight', 0x0920],
      ['KeyS', 0x0922],
      ['Semicolon', 0x092a],
      ['Quote', 0x092b],
      ['KeyZ', 0x092c],
      ['KeyX', 0x092d],
      ['KeyV', 0x092f],
      ['Comma', 0x0933],
      ['Period', 0x0934],
      ['Slash', 0x0935],
    ])('maps %s to the expected consonant', (code, codePoint) => {
      const result = hiKrutiDevLayout.mapKey(keyEvent(code), state(''))
      expect(result.text).toBe(chars(codePoint))
      expect(result.consumed).toBe(true)
      expect(result.invalid).toBe(false)
    })

    it('maps the space bar to a space', () => {
      expect(hiKrutiDevLayout.mapKey(keyEvent('Space'), state('')).text).toBe(' ')
    })

    it('maps shifted KeyJ to the halant', () => {
      expect(hiKrutiDevLayout.mapKey(keyEvent('KeyJ', { shiftKey: true }), state('')).text).toBe(VIRAMA)
    })
  })

  describe('the shifted vowel keys', () => {
    it.each([
      ['Digit1', 0x0905],
      ['Digit2', 0x0906],
      ['KeyA', 0x0906],
      ['KeyB', 0x0908],
      ['KeyC', 0x090a],
      ['KeyD', 0x090c],
      ['KeyE', 0x0910],
      ['KeyG', 0x0912],
      ['KeyH', 0x0914],
      ['KeyM', 0x090d],
      ['KeyN', 0x0902],
    ])('maps shifted %s to the expected vowel', (code, codePoint) => {
      const result = hiKrutiDevLayout.mapKey(keyEvent(code, { shiftKey: true }), state(''))
      expect(result.text).toBe(chars(codePoint))
    })

    it('maps shifted Semicolon to the visarga', () => {
      expect(hiKrutiDevLayout.mapKey(keyEvent('Semicolon', { shiftKey: true }), state('')).text).toBe(
        chars(0x0903),
      )
    })

    it('maps shifted Quote to the chandrabindu', () => {
      expect(hiKrutiDevLayout.mapKey(keyEvent('Quote', { shiftKey: true }), state('')).text).toBe(
        chars(0x0901),
      )
    })
  })

  describe('the ambiguous keys', () => {
    it('draws the consonant when the passage continues with it', () => {
      // The E key draws the consonant GA, the vowel E or the E matra. The
      // passage says a GA comes next, so that is what the key produces.
      const result = hiKrutiDevLayout.mapKey(keyEvent('KeyE'), state('', GA + AA_MATRA))
      expect(result.text).toBe(GA)
    })

    it('draws the vowel when the passage continues with it', () => {
      // The E key draws the vowel E when the passage says an E comes next.
      const result = hiKrutiDevLayout.mapKey(keyEvent('KeyE'), state('', E_VOWEL + AA_MATRA))
      expect(result.text).toBe(E_VOWEL)
    })

    it('draws the matra when the passage continues with it', () => {
      // The E key draws the E matra when the passage says one comes next.
      // The KA has already been typed, so the matra is what follows it.
      const result = hiKrutiDevLayout.mapKey(keyEvent('KeyE'), state(KA, KA + E_MATRA))
      expect(result.text).toBe(E_MATRA)
    })

    it('draws the vowel when the passage continues with it', () => {
      // The passage says an A comes next.
      const result = hiKrutiDevLayout.mapKey(keyEvent('KeyA'), state('', A_VOWEL + AA_MATRA))
      expect(result.text).toBe(A_VOWEL)
    })

    it('draws the matra after a consonant', () => {
      const result = hiKrutiDevLayout.mapKey(keyEvent('KeyA'), state(KA))
      expect(result.text).toBe(AA_MATRA)
    })

    it('draws the matra after a consonant that already carries one', () => {
      const result = hiKrutiDevLayout.mapKey(keyEvent('KeyA'), state(KA + AA_MATRA))
      expect(result.text).toBe(AA_MATRA)
    })

    it('draws the vowel when there is no passage to consult', () => {
      const result = hiKrutiDevLayout.mapKey(keyEvent('KeyA'), state(''))
      expect(result.text).toBe(A_VOWEL)
    })

    it('draws the vowel when the passage no longer lines up', () => {
      const result = hiKrutiDevLayout.mapKey(keyEvent('KeyA'), state('zz', KA + AA_MATRA))
      expect(result.text).toBe(A_VOWEL)
    })

    it('draws the i matra for the B key after a consonant', () => {
      const result = hiKrutiDevLayout.mapKey(keyEvent('KeyB'), state(KA))
      expect(result.text).toBe(I_MATRA)
    })

    it('draws the short e matra for the E key after a consonant', () => {
      const result = hiKrutiDevLayout.mapKey(keyEvent('KeyE'), state(KA))
      expect(result.text).toBe(E_MATRA)
    })
  })

  describe('typing a whole word', () => {
    it('produces the exact Unicode for a joined word', () => {
      // KA + VIRAMA + RA + AA matra
      const text = type(['KeyQ', 'KeyV', 'KeyA'], KA + VIRAMA + RA + AA_MATRA)
      expect(text).toBe(KA + VIRAMA + RA + AA_MATRA)
    })

    it('produces the exact Unicode for a word with a pre-base matra', () => {
      // KA + I matra + TA + AA matra + BA
      // The I matra is the unshifted B key in Kruti Dev; the AA matra is the
      // unshifted A key.
      const text = type(['KeyQ', 'KeyB', 'KeyF', 'KeyA', 'Quote'], KA + I_MATRA + TA + AA_MATRA + BA)
      expect(text).toBe(KA + I_MATRA + TA + AA_MATRA + BA)
    })

    it('produces the exact Unicode for a word that starts with a vowel', () => {
      // AA vowel + DA + AA matra + MA + I matra
      // The AA vowel is the shifted A key in Kruti Dev; the AA matra is the
      // unshifted one.
      const text = type(
        [['KeyA', { shiftKey: true }], 'KeyH', 'KeyA', 'KeyX', 'KeyB'],
        AA_VOWEL + DA + AA_MATRA + MA + I_MATRA,
      )
      expect(text).toBe(AA_VOWEL + DA + AA_MATRA + MA + I_MATRA)
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
      const result = hiKrutiDevLayout.mapKey(keyEvent(code), state(''))
      expect(result.consumed).toBe(false)
      expect(result.text).toBe('')
    })

    it('leaves Backspace to the typing area', () => {
      expect(hiKrutiDevLayout.mapKey(keyEvent('Backspace'), state(KA)).consumed).toBe(false)
    })

    it('leaves a control combination to the browser', () => {
      const result = hiKrutiDevLayout.mapKey(keyEvent('KeyQ', { ctrlKey: true }), state(''))
      expect(result.consumed).toBe(false)
    })
  })

  describe('nextExpectedKey', () => {
    it('points at the consonant key for the next character', () => {
      expect(hiKrutiDevLayout.nextExpectedKey(KA + TA, '')).toBe('KeyQ')
    })

    it('points at the space bar for a space', () => {
      expect(hiKrutiDevLayout.nextExpectedKey(KA + ' ' + TA, KA)).toBe('Space')
    })

    it('points at the matra key for a matra', () => {
      expect(hiKrutiDevLayout.nextExpectedKey(KA + AA_MATRA, KA)).toBe('KeyA')
    })

    it('skips the halant that the layout inserts itself', () => {
      expect(hiKrutiDevLayout.nextExpectedKey(KA + VIRAMA + TA, KA)).toBe('KeyF')
    })

    it('returns null when the passage is exhausted', () => {
      expect(hiKrutiDevLayout.nextExpectedKey(KA, KA)).toBeNull()
    })
  })

  describe('the layout metadata', () => {
    it('is identified as the Kruti Dev layout', () => {
      expect(hiKrutiDevLayout.id).toBe('hi-krutidev')
      expect(hiKrutiDevLayout.language).toBe('HI')
    })

    it('has four rows of keys', () => {
      expect(hiKrutiDevLayout.rows).toHaveLength(4)
    })
  })
})
