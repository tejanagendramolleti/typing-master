import type { KeyboardLayout, KeyEvent, LayoutOutput, LayoutState } from '../types'
import { output } from '../types'
import { alignOffset, countViramas, isCombiningMark, isDevanagariConsonant } from '../indic'
import { chars } from '../chars'

/**
 * Hindi Kruti Dev 010 — a best-effort keystroke-to-Unicode layer.
 *
 * ## Why this layout is different
 *
 * Kruti Dev 010 is a **font**, not a keyboard. The bytes a person types are
 * not the characters they see; the font decides how to draw them. Two
 * consequences follow.
 *
 * **1. The same key can mean two things.** The byte `k` draws the consonant
 * न in one place and the long-ī matra ी in another, depending on what
 * surrounds it. The byte `a` can draw अ, the matra ा, or the consonant ड.
 *
 * **2. The output is not Unicode.** Even a perfect run produces legacy byte
 * sequences that only render correctly inside the Kruti Dev font.
 *
 * This layer takes the Kruti Dev keystrokes and produces **canonical
 * Unicode**, which is what the reference passages are written in. The
 * ambiguity in (1) is resolved by reading the passage: the layout looks at
 * which character comes next and picks the consonant or the vowel
 * accordingly. That is the same information a Kruti Dev user gets by
 * looking at the text in front of them.
 *
 * The limitations of this approach are listed in `KNOWN_ISSUES.md`.
 */

/** The Devanagari halant. */
const VIRAMA = chars(0x094d)

/**
 * The three things an ambiguous key can draw.
 *
 * `consonant` is what the key draws in a consonant slot, `vowel` when it
 * stands alone, and `matra` when it attaches to the consonant before it.
 */
interface KrutiKey {
  consonant?: string
  vowel?: string
  matra?: string
}

/**
 * The unshifted Kruti Dev 010 table.
 *
 * The letters follow the Kruti Dev arrangement, which differs from the
 * phonetic Devanagari arrangement used by the Inscript layout.
 */
const KEYS: Record<string, KrutiKey> = {
  // qwerty row
  KeyQ: { consonant: chars(0x0915) }, // ka
  KeyW: { consonant: chars(0x0916) }, // kha
  KeyE: { consonant: chars(0x0917), vowel: chars(0x090e), matra: chars(0x0946) }, // ga / short e
  KeyR: { consonant: chars(0x0918) }, // gha
  KeyT: { consonant: chars(0x0919) }, // nga
  KeyY: { consonant: chars(0x091a) }, // cha
  KeyU: { consonant: chars(0x091b) }, // chha
  KeyI: { consonant: chars(0x091c), matra: chars(0x093f) }, // ja / i
  KeyO: { consonant: chars(0x091d), matra: chars(0x094b) }, // jha / o
  KeyP: { consonant: chars(0x091e), matra: chars(0x094c) }, // nya / au
  BracketLeft: { consonant: chars(0x091f) }, // tta
  BracketRight: { consonant: chars(0x0920) }, // ttha
  // asdf row
  KeyA: { consonant: chars(0x0921), vowel: chars(0x0905), matra: chars(0x093e) }, // dda / a
  KeyS: { consonant: chars(0x0922) }, // ddha
  KeyD: { consonant: chars(0x0923), vowel: chars(0x090b), matra: chars(0x0943) }, // nna / vocalic r
  KeyF: { consonant: chars(0x0924), vowel: chars(0x0911), matra: chars(0x0949) }, // ta / candra o
  KeyG: { consonant: chars(0x0925), vowel: chars(0x090d), matra: chars(0x0945) }, // tha / candra e
  KeyH: { consonant: chars(0x0926), vowel: chars(0x0914), matra: chars(0x094c) }, // da / au
  KeyJ: { consonant: chars(0x0927), matra: chars(0x0946) }, // dha / short e
  KeyK: { consonant: chars(0x0928), matra: chars(0x0940) }, // na / ii
  KeyL: { consonant: chars(0x0929), matra: chars(0x0941) }, // pa / u
  Semicolon: { consonant: chars(0x092a) }, // pha
  Quote: { consonant: chars(0x092b) }, // ba
  // zxcv row
  KeyZ: { consonant: chars(0x092c) }, // bha
  KeyX: { consonant: chars(0x092d) }, // ma
  KeyC: { consonant: chars(0x092e), vowel: chars(0x0909), matra: chars(0x0941) }, // ya / u
  KeyV: { consonant: chars(0x092f) }, // ra
  KeyB: { consonant: chars(0x0930), vowel: chars(0x0907), matra: chars(0x093f) }, // la / i
  KeyN: { consonant: chars(0x0931), matra: chars(0x0943) }, // va / vocalic r
  KeyM: { consonant: chars(0x0932), matra: chars(0x0942) }, // sha / uu
  Comma: { consonant: chars(0x0933) }, // ssa
  Period: { consonant: chars(0x0934) }, // sa
  Slash: { consonant: chars(0x0935) }, // ha
}

/**
 * The shifted Kruti Dev 010 table.
 *
 * Shifted keys produce the independent vowels, the dotted consonants and
 * the signs that stand on their own.
 */
const SHIFTED: Record<string, KrutiKey> = {
  Digit1: { vowel: chars(0x0905) }, // a
  Digit2: { vowel: chars(0x0906) }, // aa
  KeyA: { vowel: chars(0x0906) }, // aa
  KeyB: { vowel: chars(0x0908) }, // ii
  KeyC: { vowel: chars(0x090a) }, // uu
  KeyD: { vowel: chars(0x090c) }, // vocalic l
  KeyE: { vowel: chars(0x0910) }, // ai
  KeyG: { vowel: chars(0x0912) }, // o
  KeyH: { vowel: chars(0x0914) }, // au
  KeyJ: { consonant: VIRAMA }, // the halant
  KeyM: { vowel: chars(0x090d) }, // candra e
  KeyN: { vowel: chars(0x0902) }, // anusvara
  KeyL: { consonant: chars(0x0933) }, // the retroflex ssa
  KeyQ: { consonant: chars(0x0958) }, // qa
  KeyW: { consonant: chars(0x0959) }, // khha
  KeyR: { consonant: chars(0x095a) }, // gha
  KeyS: { consonant: chars(0x095b) }, // za
  KeyT: { consonant: chars(0x095c) }, // dddha
  KeyU: { consonant: chars(0x095d) }, // rha
  KeyV: { consonant: chars(0x095e) }, // fa
  KeyY: { consonant: chars(0x095f) }, // yya
  Semicolon: { vowel: chars(0x0903) }, // visarga
  Quote: { vowel: chars(0x0901) }, // chandrabindu
  Backquote: { vowel: chars(0x0902) }, // anusvara
}

/** Keys the layout leaves to the browser. */
const CONTROL_KEYS = new Set([
  'Tab', 'Enter', 'Escape', 'ShiftLeft', 'ShiftRight',
  'ControlLeft', 'ControlRight', 'AltLeft', 'AltRight',
  'MetaLeft', 'MetaRight', 'CapsLock', 'ContextMenu',
])

/** Every character the layout can produce, so the hint can find its key. */
const CHARACTER_TO_KEY = new Map<string, string>()
for (const [code, value] of Object.entries(KEYS)) {
  for (const character of [value.consonant, value.vowel, value.matra]) {
    if (character && !CHARACTER_TO_KEY.has(character)) CHARACTER_TO_KEY.set(character, code)
  }
}
for (const [code, value] of Object.entries(SHIFTED)) {
  for (const character of [value.consonant, value.vowel, value.matra]) {
    if (character && !CHARACTER_TO_KEY.has(character)) CHARACTER_TO_KEY.set(character, code)
  }
}

/**
 * The character the passage expects next.
 *
 * Only a clean prefix is trusted. Once the candidate has made a mistake the
 * passage no longer says anything useful about the next character.
 */
function expectedCharacter(reference: string, typed: string): string | null {
  if (!reference || !reference.startsWith(typed)) return null
  let rest = reference.slice(typed.length)
  if (!rest) return null
  const viramas = countViramas(rest, VIRAMA)
  if (viramas > 0) {
    const after = rest.slice(viramas)
    if (after) rest = after
  }
  return rest[0] ?? null
}

/**
 * The last character that is not a combining mark.
 *
 * A consonant that carries a matra is still that consonant, so the rule
 * that asks "is there a consonant before this?" has to look past the mark.
 */
function lastBaseCharacter(text: string): string {
  let index = text.length - 1
  while (index >= 0 && isCombiningMark(text[index])) {
    index--
  }
  return index >= 0 ? text[index] : ''
}

/**
 * The text a consonant key produces, with a halant in front of it when the
 * passage writes it as part of a conjunct.
 *
 * Kruti Dev writes a conjunct as the two consonants with a halant between
 * them, exactly as Unicode does, so the same rule applies: the passage says
 * whether the two consonants are joined.
 *
 * @param consonant the consonant the key produces
 * @param state the current typing state
 */
function conjunctOutput(consonant: string, state: LayoutState): LayoutOutput {
  const typedSoFar = state.text.slice(0, state.cursor)

  // The candidate typed a halant themselves — do not add a second one.
  if (typedSoFar.slice(-1) === VIRAMA) {
    return output(consonant)
  }

  const previous = lastBaseCharacter(typedSoFar)
  if (!previous || !isDevanagariConsonant(previous)) {
    return output(consonant)
  }

  const reference = state.reference
  if (!reference) {
    return output(consonant)
  }

  const offset = alignOffset(reference, typedSoFar)
  const rest = reference.slice(offset)
  const viramaCount = countViramas(rest, VIRAMA)
  if (viramaCount > 0) {
    const after = rest.slice(viramaCount)
    if (after.startsWith(consonant)) {
      return output(VIRAMA.repeat(viramaCount) + consonant)
    }
  }
  return output(consonant)
}

export const hiKrutiDevLayout: KeyboardLayout = {
  id: 'hi-krutidev',
  label: 'हिन्दी (क्रुति देव 010)',
  language: 'HI',
  description:
    'Kruti Dev 010 keystrokes translated to Unicode. The vowel or consonant meaning of a key is read from the passage.',

  rows: [
    {
      keys: [
        { code: 'Backquote', label: 'ं', shiftLabel: 'ं' },
        { code: 'Digit1', label: '1', shiftLabel: 'अ' },
        { code: 'Digit2', label: '2', shiftLabel: 'आ' },
        { code: 'KeyQ', label: 'क', shiftLabel: 'क़' },
        { code: 'KeyW', label: 'ख', shiftLabel: 'ख़' },
        { code: 'KeyE', label: 'ग', shiftLabel: 'ऐ' },
        { code: 'KeyR', label: 'घ', shiftLabel: 'ग़' },
        { code: 'KeyT', label: 'ङ', shiftLabel: 'ज़' },
        { code: 'KeyY', label: 'च', shiftLabel: 'झ़' },
        { code: 'KeyU', label: 'छ', shiftLabel: 'ञ़' },
        { code: 'KeyI', label: 'ज', shiftLabel: 'ळ' },
        { code: 'KeyO', label: 'झ', shiftLabel: 'ढ़' },
        { code: 'KeyP', label: 'ञ', shiftLabel: 'ऱ' },
        { code: 'BracketLeft', label: 'ट' },
        { code: 'BracketRight', label: 'ठ' },
        { code: 'Backspace', label: '⌫', width: 2, modifier: true },
      ],
    },
    {
      keys: [
        { code: 'Tab', label: 'Tab', width: 1.5, modifier: true },
        { code: 'KeyA', label: 'ड', shiftLabel: 'आ' },
        { code: 'KeyS', label: 'ढ', shiftLabel: 'ज़' },
        { code: 'KeyD', label: 'ण', shiftLabel: 'ॠ' },
        { code: 'KeyF', label: 'त', shiftLabel: 'ऑ' },
        { code: 'KeyG', label: 'थ', shiftLabel: 'ओ' },
        { code: 'KeyH', label: 'द', shiftLabel: 'औ' },
        { code: 'KeyJ', label: 'ध', shiftLabel: '्' },
        { code: 'KeyK', label: 'न', shiftLabel: 'ी' },
        { code: 'KeyL', label: 'प', shiftLabel: 'ु' },
        { code: 'Semicolon', label: 'फ', shiftLabel: 'ः' },
        { code: 'Quote', label: 'ब', shiftLabel: 'ँ' },
        { code: 'Enter', label: '⏎', width: 2.25, modifier: true },
      ],
    },
    {
      keys: [
        { code: 'CapsLock', label: 'Caps', width: 1.75, modifier: true },
        { code: 'KeyZ', label: 'भ' },
        { code: 'KeyX', label: 'म' },
        { code: 'KeyC', label: 'य', shiftLabel: 'ऊ' },
        { code: 'KeyV', label: 'र', shiftLabel: 'ड़' },
        { code: 'KeyB', label: 'ल', shiftLabel: 'ई' },
        { code: 'KeyN', label: 'व', shiftLabel: 'ं' },
        { code: 'KeyM', label: 'श', shiftLabel: 'ू' },
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

    const table = event.shiftKey ? SHIFTED : KEYS
    const key = table[event.code]
    if (!key) {
      if (event.key && event.key.length === 1) {
        return output(event.key)
      }
      return { text: '', consumed: false, nextHintKey: null, invalid: true }
    }

    // A key with only one meaning needs no thought, except that a consonant
    // may still need a halant in front of it to form a conjunct.
    const meanings = [key.consonant, key.vowel, key.matra].filter(Boolean) as string[]
    if (meanings.length === 1) {
      if (meanings[0] === key.consonant && key.consonant) {
        return conjunctOutput(key.consonant, state)
      }
      return output(meanings[0])
    }

    const typedSoFar = state.text.slice(0, state.cursor)
    const expected = expectedCharacter(state.reference ?? '', typedSoFar)

    // The passage comes first. It knows which of the three meanings the
    // candidate meant, and a Kruti Dev user gets the same information by
    // looking at the text in front of them.
    if (expected === key.matra) {
      return output(key.matra)
    }
    if (expected === key.vowel) {
      return output(key.vowel)
    }
    if (expected === key.consonant) {
      return conjunctOutput(key.consonant!, state)
    }

    // Without a passage, the structure decides. A key that can draw a matra
    // draws it on the consonant before it.
    if (key.matra) {
      const previous = lastBaseCharacter(typedSoFar)
      if (previous && isDevanagariConsonant(previous)) {
        return output(key.matra)
      }
    }

    if (key.vowel) {
      return output(key.vowel)
    }
    return conjunctOutput(key.consonant!, state)
  },

  nextExpectedKey(reference: string, typed: string): string | null {
    const character = expectedCharacter(reference, typed)
    if (!character) return null
    if (character === ' ') return 'Space'
    return CHARACTER_TO_KEY.get(character) ?? null
  },
}
