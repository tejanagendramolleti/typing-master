import { describe, expect, it } from 'vitest'
import {
  alignOffset,
  codePointOf,
  countViramas,
  createIndicMapper,
  isCombiningMark,
  isDevanagariConsonant,
  isDevanagariIndependentVowel,
  isDevanagariMatra,
  isTeluguConsonant,
  isTeluguIndependentVowel,
  isTeluguMatra,
  lastBaseCharacter,
} from './indic'
import { chars } from './chars'
import { keyEvent, state } from '../test/helpers'

/** The Devanagari halant and the Telugu virama. */
const VIRAMA = chars(0x094d)
const TELUGU_VIRAMA = chars(0x0c4d)

describe('the Indic helpers', () => {
  describe('codePointOf', () => {
    it('returns the code point of a character', () => {
      expect(codePointOf(chars(0x0915))).toBe(0x0915)
    })

    it('returns zero for an empty string', () => {
      expect(codePointOf('')).toBe(0)
    })
  })

  describe('the character predicates', () => {
    it('recognises a Devanagari consonant', () => {
      expect(isDevanagariConsonant(chars(0x0915))).toBe(true)
      expect(isDevanagariConsonant(chars(0x0905))).toBe(false)
    })

    it('recognises a Devanagari matra', () => {
      expect(isDevanagariMatra(chars(0x093e))).toBe(true)
      expect(isDevanagariMatra(chars(0x0915))).toBe(false)
    })

    it('recognises a Devanagari independent vowel', () => {
      expect(isDevanagariIndependentVowel(chars(0x0905))).toBe(true)
      expect(isDevanagariIndependentVowel(chars(0x093e))).toBe(false)
    })

    it('recognises a Telugu consonant', () => {
      expect(isTeluguConsonant(chars(0x0c15))).toBe(true)
      expect(isTeluguConsonant(chars(0x0c05))).toBe(false)
    })

    it('recognises a Telugu matra', () => {
      expect(isTeluguMatra(chars(0x0c3e))).toBe(true)
      expect(isTeluguMatra(chars(0x0c15))).toBe(false)
    })

    it('recognises a Telugu independent vowel', () => {
      expect(isTeluguIndependentVowel(chars(0x0c05))).toBe(true)
      expect(isTeluguIndependentVowel(chars(0x0c3e))).toBe(false)
    })
  })

  describe('isCombiningMark', () => {
    it('recognises a matra', () => {
      expect(isCombiningMark(chars(0x093e))).toBe(true)
    })

    it('recognises a halant', () => {
      expect(isCombiningMark(VIRAMA)).toBe(true)
    })

    it('rejects a consonant', () => {
      expect(isCombiningMark(chars(0x0915))).toBe(false)
    })

    it('rejects an empty string', () => {
      expect(isCombiningMark('')).toBe(false)
    })
  })

  describe('lastBaseCharacter', () => {
    it('returns the last character', () => {
      expect(lastBaseCharacter('क')).toBe('क')
    })

    it('looks past a trailing matra', () => {
      expect(lastBaseCharacter('का')).toBe('क')
    })

    it('looks past a trailing halant', () => {
      expect(lastBaseCharacter('क' + VIRAMA)).toBe('क')
    })

    it('returns an empty string for an empty input', () => {
      expect(lastBaseCharacter('')).toBe('')
    })
  })

  describe('countViramas', () => {
    it('counts one virama', () => {
      expect(countViramas(VIRAMA + 'त', VIRAMA)).toBe(1)
    })

    it('counts two viramas', () => {
      expect(countViramas(VIRAMA + VIRAMA + 'त', VIRAMA)).toBe(2)
    })

    it('counts none when the text does not start with one', () => {
      expect(countViramas('त', VIRAMA)).toBe(0)
    })

    it('counts the Telugu virama too', () => {
      expect(countViramas(TELUGU_VIRAMA + TELUGU_VIRAMA, TELUGU_VIRAMA)).toBe(2)
    })
  })

  describe('alignOffset', () => {
    it('returns the typed length when the text is a clean prefix', () => {
      expect(alignOffset('the quick', 'the ')).toBe(4)
    })

    it('returns zero for an empty typed text', () => {
      expect(alignOffset('the quick', '')).toBe(0)
    })

    it('returns the typed length when there is no reference', () => {
      expect(alignOffset('', 'abc')).toBe(3)
    })

    it('finds the offset after a mistake using the matching suffix', () => {
      // The candidate typed "teh" where the passage says "the", then
      // continued with "quick". The suffix "h" lines up at index 2.
      expect(alignOffset('the quick', 'teh quick')).toBe(9)
    })

    it('falls back to the typed length when nothing lines up', () => {
      expect(alignOffset('the quick', 'zzzzz')).toBe(5)
    })
  })

  describe('createIndicMapper', () => {
    const mapper = createIndicMapper({
      virama: VIRAMA,
      consonants: { KeyQ: chars(0x0915), KeyF: chars(0x0924) },
      vowelKeys: {
        Digit1: { matra: chars(0x093e), independent: chars(0x0905) },
      },
      extraKeys: {
        Backquote: { unshifted: chars(0x0902), shifted: chars(0x0903) },
      },
      isConsonant: isDevanagariConsonant,
    })

    it('maps a consonant', () => {
      expect(mapper.mapKey(keyEvent('KeyQ'), state('')).text).toBe(chars(0x0915))
    })

    it('maps a space', () => {
      expect(mapper.mapKey(keyEvent('Space'), state('')).text).toBe(' ')
    })

    it('maps an extra sign', () => {
      expect(mapper.mapKey(keyEvent('Backquote'), state('')).text).toBe(chars(0x0902))
    })

    it('maps a shifted extra sign', () => {
      expect(mapper.mapKey(keyEvent('Backquote', { shiftKey: true }), state('')).text).toBe(chars(0x0903))
    })

    it('maps the independent vowel when nothing precedes it', () => {
      expect(mapper.mapKey(keyEvent('Digit1'), state('')).text).toBe(chars(0x0905))
    })

    it('maps the matra when a consonant precedes it', () => {
      expect(mapper.mapKey(keyEvent('Digit1'), state(chars(0x0915))).text).toBe(chars(0x093e))
    })

    it('maps the independent vowel when shift is held', () => {
      expect(mapper.mapKey(keyEvent('Digit1', { shiftKey: true }), state(chars(0x0915))).text).toBe(
        chars(0x0905),
      )
    })

    it('falls back to the browser for an unknown key', () => {
      const result = mapper.mapKey(
        { key: 'x', code: 'KeyZ', ctrlKey: false, altKey: false, shiftKey: false, metaKey: false },
        state(''),
      )
      expect(result.text).toBe('x')
    })

    it('marks a key it cannot map as invalid', () => {
      const result = mapper.mapKey(
        { key: 'F13', code: 'F13', ctrlKey: false, altKey: false, shiftKey: false, metaKey: false },
        state(''),
      )
      expect(result.invalid).toBe(true)
    })

    it('joins two consonants when the passage says so', () => {
      const result = mapper.mapKey(
        keyEvent('KeyF'),
        state(chars(0x0915), chars(0x0915) + VIRAMA + chars(0x0924)),
      )
      expect(result.text).toBe(VIRAMA + chars(0x0924))
    })

    it('keeps two consonants separate when the passage says so', () => {
      const result = mapper.mapKey(keyEvent('KeyF'), state(chars(0x0915), chars(0x0915) + chars(0x0924)))
      expect(result.text).toBe(chars(0x0924))
    })

    it('points at the next key', () => {
      expect(mapper.nextExpectedKey(chars(0x0915) + chars(0x0924), '')).toBe('KeyQ')
    })

    it('points at the space bar for a space', () => {
      expect(mapper.nextExpectedKey(chars(0x0915) + ' ', chars(0x0915))).toBe('Space')
    })

    it('points at the matra key for a matra', () => {
      expect(mapper.nextExpectedKey(chars(0x0915) + chars(0x093e), chars(0x0915))).toBe('Digit1')
    })

    it('points at the sign key for a sign', () => {
      expect(mapper.nextExpectedKey(chars(0x0902), '')).toBe('Backquote')
    })

    it('returns null for an unknown character', () => {
      expect(mapper.nextExpectedKey('€', '')).toBeNull()
    })

    it('returns null for an empty reference', () => {
      expect(mapper.nextExpectedKey('', '')).toBeNull()
    })
  })
})
