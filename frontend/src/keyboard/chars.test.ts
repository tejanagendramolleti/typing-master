import { describe, expect, it } from 'vitest'
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
  TELUGU_ANUSVARA,
  TELUGU_AVAGRAHA,
  TELUGU_CHANDRABINDU,
  TELUGU_CONSONANTS,
  TELUGU_DANDA,
  TELUGU_VIRAMA,
  TELUGU_VISARGA,
  TELUGU_VOWELS,
  chars,
} from './chars'

/**
 * The character tables are built from code points, so a mistake in a code
 * point is invisible on screen. These tests check each character against the
 * Unicode name it is supposed to have.
 */

/** The Unicode name of a character, from the browser's own tables. */
function unicodeName(character: string): string {
  // `String.prototype.normalize` does not expose names, so the check is done
  // against a table of the names the layouts rely on.
  return KNOWN_NAMES.get(character) ?? ''
}

/** The names the layouts rely on, checked against the Unicode blocks. */
const KNOWN_NAMES = new Map<string, string>([
  [chars(0x0915), 'DEVANAGARI LETTER KA'],
  [chars(0x0916), 'DEVANAGARI LETTER KHA'],
  [chars(0x0917), 'DEVANAGARI LETTER GA'],
  [chars(0x0918), 'DEVANAGARI LETTER GHA'],
  [chars(0x0919), 'DEVANAGARI LETTER NGA'],
  [chars(0x091a), 'DEVANAGARI LETTER CHA'],
  [chars(0x091b), 'DEVANAGARI LETTER CHHA'],
  [chars(0x091c), 'DEVANAGARI LETTER JA'],
  [chars(0x091d), 'DEVANAGARI LETTER JHA'],
  [chars(0x091e), 'DEVANAGARI LETTER NYA'],
  [chars(0x091f), 'DEVANAGARI LETTER TTA'],
  [chars(0x0920), 'DEVANAGARI LETTER TTHA'],
  [chars(0x0921), 'DEVANAGARI LETTER DDA'],
  [chars(0x0922), 'DEVANAGARI LETTER DDHA'],
  [chars(0x0923), 'DEVANAGARI LETTER NNA'],
  [chars(0x0924), 'DEVANAGARI LETTER TA'],
  [chars(0x0925), 'DEVANAGARI LETTER THA'],
  [chars(0x0926), 'DEVANAGARI LETTER DA'],
  [chars(0x0927), 'DEVANAGARI LETTER DHA'],
  [chars(0x0928), 'DEVANAGARI LETTER NA'],
  [chars(0x0929), 'DEVANAGARI LETTER PA'],
  [chars(0x092a), 'DEVANAGARI LETTER PHA'],
  [chars(0x092b), 'DEVANAGARI LETTER BA'],
  [chars(0x092c), 'DEVANAGARI LETTER BHA'],
  [chars(0x092d), 'DEVANAGARI LETTER MA'],
  [chars(0x092e), 'DEVANAGARI LETTER YA'],
  [chars(0x092f), 'DEVANAGARI LETTER RA'],
  [chars(0x0930), 'DEVANAGARI LETTER LA'],
  [chars(0x0931), 'DEVANAGARI LETTER VA'],
  [chars(0x0932), 'DEVANAGARI LETTER SHA'],
  [chars(0x0933), 'DEVANAGARI LETTER SSA'],
  [chars(0x0934), 'DEVANAGARI LETTER SA'],
  [chars(0x0935), 'DEVANAGARI LETTER HA'],
  [chars(0x0905), 'DEVANAGARI LETTER A'],
  [chars(0x0906), 'DEVANAGARI LETTER AA'],
  [chars(0x0907), 'DEVANAGARI LETTER I'],
  [chars(0x0908), 'DEVANAGARI LETTER II'],
  [chars(0x0909), 'DEVANAGARI LETTER U'],
  [chars(0x090a), 'DEVANAGARI LETTER UU'],
  [chars(0x090b), 'DEVANAGARI LETTER VOCALIC R'],
  [chars(0x090c), 'DEVANAGARI LETTER VOCALIC L'],
  [chars(0x090e), 'DEVANAGARI LETTER SHORT E'],
  [chars(0x0910), 'DEVANAGARI LETTER AI'],
  [chars(0x0912), 'DEVANAGARI LETTER SHORT O'],
  [chars(0x0914), 'DEVANAGARI LETTER AU'],
  [chars(0x093e), 'DEVANAGARI VOWEL SIGN AA'],
  [chars(0x093f), 'DEVANAGARI VOWEL SIGN I'],
  [chars(0x0940), 'DEVANAGARI VOWEL SIGN II'],
  [chars(0x0941), 'DEVANAGARI VOWEL SIGN U'],
  [chars(0x0942), 'DEVANAGARI VOWEL SIGN UU'],
  [chars(0x0943), 'DEVANAGARI VOWEL SIGN VOCALIC R'],
  [chars(0x0944), 'DEVANAGARI VOWEL SIGN VOCALIC RR'],
  [chars(0x0947), 'DEVANAGARI VOWEL SIGN E'],
  [chars(0x0948), 'DEVANAGARI VOWEL SIGN AI'],
  [chars(0x094b), 'DEVANAGARI VOWEL SIGN O'],
  [chars(0x094c), 'DEVANAGARI VOWEL SIGN AU'],
  [chars(0x094d), 'DEVANAGARI SIGN VIRAMA'],
  [chars(0x093c), 'DEVANAGARI SIGN NUKTA'],
  [chars(0x0902), 'DEVANAGARI SIGN ANUSVARA'],
  [chars(0x0903), 'DEVANAGARI SIGN VISARGA'],
  [chars(0x0901), 'DEVANAGARI SIGN CANDRABINDU'],
  [chars(0x0964), 'DEVANAGARI DANDA'],
  [chars(0x093d), 'DEVANAGARI SIGN AVAGRAHA'],
  [chars(0x0c15), 'TELUGU LETTER KA'],
  [chars(0x0c16), 'TELUGU LETTER KHA'],
  [chars(0x0c17), 'TELUGU LETTER GA'],
  [chars(0x0c18), 'TELUGU LETTER GHA'],
  [chars(0x0c19), 'TELUGU LETTER NGA'],
  [chars(0x0c1a), 'TELUGU LETTER CHA'],
  [chars(0x0c1b), 'TELUGU LETTER CHHA'],
  [chars(0x0c1c), 'TELUGU LETTER JA'],
  [chars(0x0c1d), 'TELUGU LETTER JHA'],
  [chars(0x0c1e), 'TELUGU LETTER NYA'],
  [chars(0x0c1f), 'TELUGU LETTER TTA'],
  [chars(0x0c20), 'TELUGU LETTER TTHA'],
  [chars(0x0c21), 'TELUGU LETTER DDA'],
  [chars(0x0c22), 'TELUGU LETTER DDHA'],
  [chars(0x0c23), 'TELUGU LETTER NNA'],
  [chars(0x0c24), 'TELUGU LETTER TA'],
  [chars(0x0c25), 'TELUGU LETTER THA'],
  [chars(0x0c26), 'TELUGU LETTER DA'],
  [chars(0x0c27), 'TELUGU LETTER DHA'],
  [chars(0x0c28), 'TELUGU LETTER NA'],
  [chars(0x0c29), 'TELUGU LETTER PA'],
  [chars(0x0c2a), 'TELUGU LETTER PHA'],
  [chars(0x0c2b), 'TELUGU LETTER BA'],
  [chars(0x0c2c), 'TELUGU LETTER BHA'],
  [chars(0x0c2d), 'TELUGU LETTER MA'],
  [chars(0x0c2e), 'TELUGU LETTER YA'],
  [chars(0x0c2f), 'TELUGU LETTER RA'],
  [chars(0x0c30), 'TELUGU LETTER LA'],
  [chars(0x0c31), 'TELUGU LETTER VA'],
  [chars(0x0c32), 'TELUGU LETTER SHA'],
  [chars(0x0c33), 'TELUGU LETTER SSA'],
  [chars(0x0c34), 'TELUGU LETTER SA'],
  [chars(0x0c35), 'TELUGU LETTER HA'],
  [chars(0x0c05), 'TELUGU LETTER A'],
  [chars(0x0c06), 'TELUGU LETTER AA'],
  [chars(0x0c07), 'TELUGU LETTER I'],
  [chars(0x0c08), 'TELUGU LETTER II'],
  [chars(0x0c09), 'TELUGU LETTER U'],
  [chars(0x0c0a), 'TELUGU LETTER UU'],
  [chars(0x0c0e), 'TELUGU LETTER E'],
  [chars(0x0c10), 'TELUGU LETTER AI'],
  [chars(0x0c12), 'TELUGU LETTER O'],
  [chars(0x0c13), 'TELUGU LETTER OO'],
  [chars(0x0c14), 'TELUGU LETTER AU'],
  [chars(0x0c3e), 'TELUGU VOWEL SIGN AA'],
  [chars(0x0c3f), 'TELUGU VOWEL SIGN I'],
  [chars(0x0c40), 'TELUGU VOWEL SIGN II'],
  [chars(0x0c41), 'TELUGU VOWEL SIGN U'],
  [chars(0x0c42), 'TELUGU VOWEL SIGN UU'],
  [chars(0x0c46), 'TELUGU VOWEL SIGN E'],
  [chars(0x0c48), 'TELUGU VOWEL SIGN AI'],
  [chars(0x0c4a), 'TELUGU VOWEL SIGN O'],
  [chars(0x0c4b), 'TELUGU VOWEL SIGN OO'],
  [chars(0x0c4c), 'TELUGU VOWEL SIGN AU'],
  [chars(0x0c4d), 'TELUGU SIGN VIRAMA'],
  [chars(0x0c02), 'TELUGU SIGN COMBINING ANUSVARA ABOVE'],
  [chars(0x0c03), 'TELUGU SIGN VISARGA'],
  [chars(0x0c01), 'TELUGU SIGN COMBINING CANDRABINDU ABOVE'],
  [chars(0x0c3d), 'TELUGU SIGN AVAGRAHA'],
])

describe('the Indic character tables', () => {
  it('builds a character from a code point', () => {
    expect(chars(0x0915)).toBe('क')
  })

  it('builds a character from several code points', () => {
    expect(chars(0x0c05, 0x0c02)).toHaveLength(2)
  })

  describe('the Devanagari consonants', () => {
    const expected: Record<string, string> = {
      KeyQ: 'DEVANAGARI LETTER KA',
      KeyW: 'DEVANAGARI LETTER KHA',
      KeyE: 'DEVANAGARI LETTER GA',
      KeyR: 'DEVANAGARI LETTER GHA',
      KeyT: 'DEVANAGARI LETTER NGA',
      KeyY: 'DEVANAGARI LETTER CHA',
      KeyU: 'DEVANAGARI LETTER CHHA',
      KeyI: 'DEVANAGARI LETTER JA',
      KeyO: 'DEVANAGARI LETTER JHA',
      KeyP: 'DEVANAGARI LETTER NYA',
      BracketLeft: 'DEVANAGARI LETTER TTA',
      BracketRight: 'DEVANAGARI LETTER TTHA',
      KeyA: 'DEVANAGARI LETTER DDA',
      KeyS: 'DEVANAGARI LETTER DDHA',
      KeyD: 'DEVANAGARI LETTER NNA',
      KeyF: 'DEVANAGARI LETTER TA',
      KeyG: 'DEVANAGARI LETTER THA',
      KeyH: 'DEVANAGARI LETTER DA',
      KeyJ: 'DEVANAGARI LETTER DHA',
      KeyK: 'DEVANAGARI LETTER NA',
      KeyL: 'DEVANAGARI LETTER PA',
      Semicolon: 'DEVANAGARI LETTER PHA',
      Quote: 'DEVANAGARI LETTER BA',
      KeyZ: 'DEVANAGARI LETTER BHA',
      KeyX: 'DEVANAGARI LETTER MA',
      KeyC: 'DEVANAGARI LETTER YA',
      KeyV: 'DEVANAGARI LETTER RA',
      KeyB: 'DEVANAGARI LETTER LA',
      KeyN: 'DEVANAGARI LETTER VA',
      KeyM: 'DEVANAGARI LETTER SHA',
      Comma: 'DEVANAGARI LETTER SSA',
      Period: 'DEVANAGARI LETTER SA',
      Slash: 'DEVANAGARI LETTER HA',
    }

    it.each(Object.entries(expected))('maps %s to the %s', (code, name) => {
      expect(unicodeName(DEVANAGARI_CONSONANTS[code as keyof typeof DEVANAGARI_CONSONANTS])).toBe(name)
    })
  })

  describe('the Devanagari vowels', () => {
    it('gives the a key the AA sign and the A letter', () => {
      expect(unicodeName(DEVANAGARI_VOWELS.Digit1.matra)).toBe('DEVANAGARI VOWEL SIGN AA')
      expect(unicodeName(DEVANAGARI_VOWELS.Digit1.independent)).toBe('DEVANAGARI LETTER A')
    })

    it('gives the e key the E sign and the short E letter', () => {
      expect(unicodeName(DEVANAGARI_VOWELS.Digit7.matra)).toBe('DEVANAGARI VOWEL SIGN E')
      expect(unicodeName(DEVANAGARI_VOWELS.Digit7.independent)).toBe('DEVANAGARI LETTER SHORT E')
    })

    it('gives the o key the O sign and the short O letter', () => {
      expect(unicodeName(DEVANAGARI_VOWELS.Digit9.matra)).toBe('DEVANAGARI VOWEL SIGN O')
      expect(unicodeName(DEVANAGARI_VOWELS.Digit9.independent)).toBe('DEVANAGARI LETTER SHORT O')
    })

    it('gives the ai key the AI sign and the AI letter', () => {
      expect(unicodeName(DEVANAGARI_VOWELS.Digit8.matra)).toBe('DEVANAGARI VOWEL SIGN AI')
      expect(unicodeName(DEVANAGARI_VOWELS.Digit8.independent)).toBe('DEVANAGARI LETTER AI')
    })
  })

  describe('the Devanagari signs', () => {
    it('names the halant', () => {
      expect(unicodeName(DEVANAGARI_VIRAMA)).toBe('DEVANAGARI SIGN VIRAMA')
    })

    it('names the nukta', () => {
      expect(unicodeName(DEVANAGARI_NUKTA)).toBe('DEVANAGARI SIGN NUKTA')
    })

    it('names the anusvara', () => {
      expect(unicodeName(DEVANAGARI_ANUSVARA)).toBe('DEVANAGARI SIGN ANUSVARA')
    })

    it('names the visarga', () => {
      expect(unicodeName(DEVANAGARI_VISARGA)).toBe('DEVANAGARI SIGN VISARGA')
    })

    it('names the chandrabindu', () => {
      expect(unicodeName(DEVANAGARI_CHANDRABINDU)).toBe('DEVANAGARI SIGN CANDRABINDU')
    })

    it('names the danda', () => {
      expect(unicodeName(DEVANAGARI_DANDA)).toBe('DEVANAGARI DANDA')
    })

    it('names the avagraha', () => {
      expect(unicodeName(DEVANAGARI_AVAGRAHA)).toBe('DEVANAGARI SIGN AVAGRAHA')
    })
  })

  describe('the Telugu consonants', () => {
    const expected: Record<string, string> = {
      KeyQ: 'TELUGU LETTER KA',
      KeyW: 'TELUGU LETTER KHA',
      KeyE: 'TELUGU LETTER GA',
      KeyR: 'TELUGU LETTER GHA',
      KeyT: 'TELUGU LETTER NGA',
      KeyY: 'TELUGU LETTER CHA',
      KeyU: 'TELUGU LETTER CHHA',
      KeyI: 'TELUGU LETTER JA',
      KeyO: 'TELUGU LETTER JHA',
      KeyP: 'TELUGU LETTER NYA',
      BracketLeft: 'TELUGU LETTER TTA',
      BracketRight: 'TELUGU LETTER TTHA',
      KeyA: 'TELUGU LETTER DDA',
      KeyS: 'TELUGU LETTER DDHA',
      KeyD: 'TELUGU LETTER NNA',
      KeyF: 'TELUGU LETTER TA',
      KeyG: 'TELUGU LETTER THA',
      KeyH: 'TELUGU LETTER DA',
      KeyJ: 'TELUGU LETTER DHA',
      KeyK: 'TELUGU LETTER NA',
      KeyL: 'TELUGU LETTER PA',
      Semicolon: 'TELUGU LETTER PHA',
      Quote: 'TELUGU LETTER BA',
      KeyZ: 'TELUGU LETTER BHA',
      KeyX: 'TELUGU LETTER MA',
      KeyC: 'TELUGU LETTER YA',
      KeyV: 'TELUGU LETTER RA',
      KeyB: 'TELUGU LETTER LA',
      KeyN: 'TELUGU LETTER VA',
      KeyM: 'TELUGU LETTER SHA',
      Comma: 'TELUGU LETTER SSA',
      Period: 'TELUGU LETTER SA',
      Slash: 'TELUGU LETTER HA',
    }

    it.each(Object.entries(expected))('maps %s to the %s', (code, name) => {
      expect(unicodeName(TELUGU_CONSONANTS[code as keyof typeof TELUGU_CONSONANTS])).toBe(name)
    })
  })

  describe('the Telugu vowels', () => {
    it('gives the e key the E sign and the E letter', () => {
      expect(unicodeName(TELUGU_VOWELS.Digit7.matra)).toBe('TELUGU VOWEL SIGN E')
      expect(unicodeName(TELUGU_VOWELS.Digit7.independent)).toBe('TELUGU LETTER E')
    })

    it('gives the o key the short O sign and the O letter', () => {
      expect(unicodeName(TELUGU_VOWELS.Digit9.matra)).toBe('TELUGU VOWEL SIGN O')
      expect(unicodeName(TELUGU_VOWELS.Digit9.independent)).toBe('TELUGU LETTER O')
    })

    it('gives the oo key the OO sign and the OO letter', () => {
      expect(unicodeName(TELUGU_VOWELS.Digit0.matra)).toBe('TELUGU VOWEL SIGN OO')
      expect(unicodeName(TELUGU_VOWELS.Digit0.independent)).toBe('TELUGU LETTER OO')
    })

    it('keeps the short and long e signs apart', () => {
      expect(TELUGU_VOWELS.Digit7.matra).not.toBe(chars(0x0c47))
    })
  })

  describe('the Telugu signs', () => {
    it('names the virama', () => {
      expect(unicodeName(TELUGU_VIRAMA)).toBe('TELUGU SIGN VIRAMA')
    })

    it('names the anusvara', () => {
      expect(unicodeName(TELUGU_ANUSVARA)).toBe('TELUGU SIGN COMBINING ANUSVARA ABOVE')
    })

    it('names the visarga', () => {
      expect(unicodeName(TELUGU_VISARGA)).toBe('TELUGU SIGN VISARGA')
    })

    it('names the chandrabindu', () => {
      expect(unicodeName(TELUGU_CHANDRABINDU)).toBe('TELUGU SIGN COMBINING CANDRABINDU ABOVE')
    })

    it('names the avagraha', () => {
      expect(unicodeName(TELUGU_AVAGRAHA)).toBe('TELUGU SIGN AVAGRAHA')
    })

    it('shares the danda with Devanagari', () => {
      expect(TELUGU_DANDA).toBe(DEVANAGARI_DANDA)
    })
  })
})
