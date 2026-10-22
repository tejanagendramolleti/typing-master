import { describe, expect, it } from 'vitest'
import { hiInscriptLayout } from './hiInscript'
import { chars } from '../chars'
import { keyEvent, state } from '../../test/helpers'

/**
 * The Devanagari characters are written as code points on purpose.
 *
 * Devanagari is a large script with many near-identical glyphs, and a
 * literal in the source can be silently normalised into a different
 * character. A code point is exactly the character it says it is, so these
 * tests check the layout rather than the editor. `chars.test.ts` checks the
 * code points themselves against the Unicode names.
 */

/** The Devanagari halant. */
const VIRAMA = chars(0x094d)
/** The Devanagari anusvara. */
const ANUSVARA = chars(0x0902)
/** The Devanagari visarga. */
const VISARGA = chars(0x0903)
/** The Devanagari nukta. */
const NUKTA = chars(0x093c)

/** KA, TA, RA, MA, BA, SA, DA — the consonants the word tests use. */
const KA = chars(0x0915)
const TA = chars(0x0924)
const RA = chars(0x092f)
const MA = chars(0x092d)
const BA = chars(0x092b)
const SA = chars(0x0934)
const DA = chars(0x0926)
/** The AA matra and the AA vowel letter. */
const AA_MATRA = chars(0x093e)
const AA_VOWEL = chars(0x0906)
/** The I matra. */
const I_MATRA = chars(0x093f)

/**
 * Types a run of physical keys and returns the text produced.
 *
 * @param codes the physical keys, in order
 * @param reference the passage being typed, when the layout needs it
 */
function type(codes: string[], reference?: string): string {
  let text = ''
  for (const code of codes) {
    const result = hiInscriptLayout.mapKey(keyEvent(code), state(text, reference))
    text += result.text
  }
  return text
}

describe('hiInscriptLayout', () => {
  describe('the consonant keys', () => {
    it.each([
      ['KeyQ', 0x0915],
      ['KeyW', 0x0916],
      ['KeyE', 0x0917],
      ['KeyR', 0x0918],
      ['KeyT', 0x0919],
      ['KeyY', 0x091a],
      ['KeyU', 0x091b],
      ['KeyI', 0x091c],
      ['KeyO', 0x091d],
      ['KeyP', 0x091e],
      ['BracketLeft', 0x091f],
      ['BracketRight', 0x0920],
      ['KeyA', 0x0921],
      ['KeyS', 0x0922],
      ['KeyD', 0x0923],
      ['KeyF', 0x0924],
      ['KeyG', 0x0925],
      ['KeyH', 0x0926],
      ['KeyJ', 0x0927],
      ['KeyK', 0x0928],
      ['KeyL', 0x0929],
      ['Semicolon', 0x092a],
      ['Quote', 0x092b],
      ['KeyZ', 0x092c],
      ['KeyX', 0x092d],
      ['KeyC', 0x092e],
      ['KeyV', 0x092f],
      ['KeyB', 0x0930],
      ['KeyN', 0x0931],
      ['KeyM', 0x0932],
      ['Comma', 0x0933],
      ['Period', 0x0934],
      ['Slash', 0x0935],
    ])('maps %s to the expected consonant', (code, codePoint) => {
      const result = hiInscriptLayout.mapKey(keyEvent(code), state(''))
      expect(result.text).toBe(chars(codePoint))
      expect(result.consumed).toBe(true)
      expect(result.invalid).toBe(false)
    })
  })

  describe('the vowel keys', () => {
    it.each([
      ['Digit1', 0x0905],
      ['Digit2', 0x0906],
      ['Digit3', 0x0907],
      ['Digit4', 0x0908],
      ['Digit5', 0x0909],
      ['Digit6', 0x090a],
      ['Digit7', 0x090e],
      ['Digit8', 0x0910],
      ['Digit9', 0x0912],
      ['Digit0', 0x0914],
      ['Minus', 0x090b],
      ['Equal', 0x090c],
    ])('maps %s to the standalone vowel on its own', (code, codePoint) => {
      expect(hiInscriptLayout.mapKey(keyEvent(code), state('')).text).toBe(chars(codePoint))
    })

    it.each([
      ['Digit1', 0x093e],
      ['Digit2', 0x093e],
      ['Digit3', 0x093f],
      ['Digit4', 0x0940],
      ['Digit5', 0x0941],
      ['Digit6', 0x0942],
      ['Digit7', 0x0947],
      ['Digit8', 0x0948],
      ['Digit9', 0x094b],
      ['Digit0', 0x094c],
      ['Minus', 0x0943],
      ['Equal', 0x0944],
    ])('maps %s to the matra after a consonant', (code, codePoint) => {
      expect(hiInscriptLayout.mapKey(keyEvent(code), state(KA)).text).toBe(chars(codePoint))
    })

    it.each([
      ['Digit1', 0x0905],
      ['Digit3', 0x0907],
      ['Digit7', 0x090e],
    ])('maps shifted %s to the standalone vowel even after a consonant', (code, codePoint) => {
      expect(hiInscriptLayout.mapKey(keyEvent(code, { shiftKey: true }), state(KA)).text).toBe(
        chars(codePoint),
      )
    })
  })

  describe('the sign keys', () => {
    it('maps the backquote key to the anusvara', () => {
      expect(hiInscriptLayout.mapKey(keyEvent('Backquote'), state('')).text).toBe(ANUSVARA)
    })

    it('maps shifted backquote to the visarga', () => {
      expect(hiInscriptLayout.mapKey(keyEvent('Backquote', { shiftKey: true }), state('')).text).toBe(VISARGA)
    })

    it('maps the backslash key to the halant', () => {
      expect(hiInscriptLayout.mapKey(keyEvent('Backslash'), state('')).text).toBe(VIRAMA)
    })

    it('maps shifted backslash to the nukta', () => {
      expect(hiInscriptLayout.mapKey(keyEvent('Backslash', { shiftKey: true }), state('')).text).toBe(NUKTA)
    })

    it('maps the space bar to a space', () => {
      expect(hiInscriptLayout.mapKey(keyEvent('Space'), state('')).text).toBe(' ')
    })
  })

  describe('the conjunct rule', () => {
    it('joins two consonants when the passage writes them joined', () => {
      // The passage says these two consonants are one conjunct.
      const result = hiInscriptLayout.mapKey(keyEvent('KeyF'), state(KA, KA + VIRAMA + TA))
      expect(result.text).toBe(VIRAMA + TA)
    })

    it('keeps two consonants separate when the passage writes them separate', () => {
      const result = hiInscriptLayout.mapKey(keyEvent('KeyF'), state(KA, KA + TA))
      expect(result.text).toBe(TA)
    })

    it('joins a consonant that follows a matra', () => {
      // The KA carries the AA matra, and the next two consonants form the
      // conjunct. The halant goes between the two members of the conjunct,
      // so the first member is typed on its own.
      const text = type(['KeyQ', 'Digit1', 'KeyQ', 'KeyF'], KA + AA_MATRA + KA + VIRAMA + TA)
      expect(text).toBe(KA + AA_MATRA + KA + VIRAMA + TA)
    })

    it('does not join across a space', () => {
      const result = hiInscriptLayout.mapKey(keyEvent('KeyF'), state(KA + ' ', KA + ' ' + TA))
      expect(result.text).toBe(TA)
    })

    it('does not add a halant when the candidate typed one themselves', () => {
      const result = hiInscriptLayout.mapKey(keyEvent('KeyF'), state(KA + VIRAMA, KA + VIRAMA + TA))
      expect(result.text).toBe(TA)
    })

    it('keeps the consonant on its own when there is no passage', () => {
      const result = hiInscriptLayout.mapKey(keyEvent('KeyF'), state(KA))
      expect(result.text).toBe(TA)
    })

    it('does not join after a vowel', () => {
      const result = hiInscriptLayout.mapKey(keyEvent('KeyF'), state(chars(0x0905), chars(0x0905) + TA))
      expect(result.text).toBe(TA)
    })

    it('joins a run of three consonants as the passage writes them', () => {
      const text = type(['KeyQ', 'KeyF', 'KeyV'], KA + VIRAMA + TA + VIRAMA + RA)
      expect(text).toBe(KA + VIRAMA + TA + VIRAMA + RA)
    })
  })

  describe('typing a whole word', () => {
    it('produces the exact Unicode for a joined word', () => {
      // KA + VIRAMA + RA + AA matra
      const text = type(['KeyQ', 'KeyV', 'Digit1'], KA + VIRAMA + RA + AA_MATRA)
      expect(text).toBe(KA + VIRAMA + RA + AA_MATRA)
    })

    it('produces the exact Unicode for a word with a pre-base matra', () => {
      // KA + I matra + TA + AA matra + BA
      const text = type(['KeyQ', 'Digit3', 'KeyF', 'Digit1', 'Quote'], KA + I_MATRA + TA + AA_MATRA + BA)
      expect(text).toBe(KA + I_MATRA + TA + AA_MATRA + BA)
    })

    it('produces the exact Unicode for a word with an anusvara', () => {
      // SA + anusvara + TA
      const text = type(['Period', 'Backquote', 'KeyF'], SA + ANUSVARA + TA)
      expect(text).toBe(SA + ANUSVARA + TA)
    })

    it('produces the exact Unicode for a word that starts with a vowel', () => {
      // AA vowel + DA + AA matra + MA + I matra
      const text = type(
        ['Digit2', 'KeyH', 'Digit1', 'KeyX', 'Digit3'],
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
      const result = hiInscriptLayout.mapKey(keyEvent(code), state(''))
      expect(result.consumed).toBe(false)
      expect(result.text).toBe('')
    })

    it('leaves Backspace to the typing area', () => {
      const result = hiInscriptLayout.mapKey(keyEvent('Backspace'), state(KA))
      expect(result.consumed).toBe(false)
    })

    it('leaves a control combination to the browser', () => {
      const result = hiInscriptLayout.mapKey(keyEvent('KeyQ', { ctrlKey: true }), state(''))
      expect(result.consumed).toBe(false)
      expect(result.text).toBe('')
    })
  })

  describe('nextExpectedKey', () => {
    it('points at the consonant key for the next character', () => {
      expect(hiInscriptLayout.nextExpectedKey(KA + TA, '')).toBe('KeyQ')
    })

    it('points at the space bar for a space', () => {
      expect(hiInscriptLayout.nextExpectedKey(KA + ' ' + TA, KA)).toBe('Space')
    })

    it('points at the matra key for a matra', () => {
      expect(hiInscriptLayout.nextExpectedKey(KA + AA_MATRA, KA)).toBe('Digit1')
    })

    it('skips the halant that the layout inserts itself', () => {
      expect(hiInscriptLayout.nextExpectedKey(KA + VIRAMA + TA, KA)).toBe('KeyF')
    })

    it('points at the anusvara key', () => {
      expect(hiInscriptLayout.nextExpectedKey(SA + ANUSVARA, SA)).toBe('Backquote')
    })

    it('returns null when the passage is exhausted', () => {
      expect(hiInscriptLayout.nextExpectedKey(KA, KA)).toBeNull()
    })
  })

  describe('the layout metadata', () => {
    it('is identified as the Hindi layout', () => {
      expect(hiInscriptLayout.id).toBe('hi-inscript')
      expect(hiInscriptLayout.language).toBe('HI')
    })

    it('has five rows of keys', () => {
      expect(hiInscriptLayout.rows).toHaveLength(5)
    })
  })

  describe('the key caps', () => {
    /**
     * The on-screen keyboard is what the candidate reads when they are not
     * sure of a key, so a cap that disagrees with the key is worse than no
     * cap at all. The number row holds the vowels, and the plain key writes
     * the sign while the shifted key writes the vowel on its own, so the
     * cap has to say the same thing.
     */
    it.each([
      ['Digit1', 0x093e, 0x0905],
      ['Digit2', 0x093e, 0x0906],
      ['Digit3', 0x093f, 0x0907],
      ['Digit4', 0x0940, 0x0908],
      ['Digit5', 0x0941, 0x0909],
      ['Digit6', 0x0942, 0x090a],
      ['Digit7', 0x0947, 0x090e],
      ['Digit8', 0x0948, 0x0910],
      ['Digit9', 0x094b, 0x0912],
      ['Digit0', 0x094c, 0x0914],
      ['Minus', 0x0943, 0x090b],
      ['Equal', 0x0944, 0x090c],
    ])('shows %s as the sign, and its shift as the vowel on its own',
      (code, matra, independent) => {
        const key = hiInscriptLayout.rows[0].keys.find((candidate) => candidate.code === code)

        expect(key?.label).toBe(chars(matra))
        expect(key?.shiftLabel).toBe(chars(independent))

        // And the caps agree with what the key actually produces.
        expect(hiInscriptLayout.mapKey(keyEvent(code), state(KA)).text).toBe(chars(matra))
        expect(hiInscriptLayout.mapKey(keyEvent(code, { shiftKey: true }), state(KA)).text).toBe(
          chars(independent),
        )
      })

    it('shows the halant and the nukta on the key that produces them', () => {
      const key = hiInscriptLayout.rows[1].keys.find((candidate) => candidate.code === 'Backslash')

      expect(key?.label).toBe(VIRAMA)
      expect(key?.shiftLabel).toBe(NUKTA)
    })
  })
})
