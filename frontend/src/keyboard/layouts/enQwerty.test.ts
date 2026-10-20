import { describe, expect, it } from 'vitest'
import { enQwertyLayout, keyForCharacter } from './enQwerty'
import { keyEvent, state } from '../../test/helpers'

/**
 * The English layout has no mapping of its own — the browser already produces
 * the right character — so these tests check that the table agrees with the
 * browser and that the control keys are handled.
 */
describe('enQwertyLayout', () => {
  describe('the letter row', () => {
    it.each([
      ['KeyQ', 'q'],
      ['KeyW', 'w'],
      ['KeyE', 'e'],
      ['KeyR', 'r'],
      ['KeyT', 't'],
      ['KeyY', 'y'],
      ['KeyU', 'u'],
      ['KeyI', 'i'],
      ['KeyO', 'o'],
      ['KeyP', 'p'],
      ['KeyA', 'a'],
      ['KeyS', 's'],
      ['KeyD', 'd'],
      ['KeyF', 'f'],
      ['KeyG', 'g'],
      ['KeyH', 'h'],
      ['KeyJ', 'j'],
      ['KeyK', 'k'],
      ['KeyL', 'l'],
      ['KeyZ', 'z'],
      ['KeyX', 'x'],
      ['KeyC', 'c'],
      ['KeyV', 'v'],
      ['KeyB', 'b'],
      ['KeyN', 'n'],
      ['KeyM', 'm'],
    ])('maps %s to %s', (code, character) => {
      const result = enQwertyLayout.mapKey(keyEvent(code), state(''))
      expect(result.text).toBe(character)
      expect(result.consumed).toBe(true)
      expect(result.invalid).toBe(false)
    })
  })

  describe('the number row', () => {
    it.each([
      ['Digit1', '1'],
      ['Digit2', '2'],
      ['Digit3', '3'],
      ['Digit4', '4'],
      ['Digit5', '5'],
      ['Digit6', '6'],
      ['Digit7', '7'],
      ['Digit8', '8'],
      ['Digit9', '9'],
      ['Digit0', '0'],
    ])('maps %s to %s', (code, character) => {
      expect(enQwertyLayout.mapKey(keyEvent(code), state('')).text).toBe(character)
    })

    it.each([
      ['Digit1', '!'],
      ['Digit2', '@'],
      ['Digit3', '#'],
      ['Digit4', '$'],
      ['Digit5', '%'],
      ['Digit6', '^'],
      ['Digit7', '&'],
      ['Digit8', '*'],
      ['Digit9', '('],
      ['Digit0', ')'],
    ])('maps shifted %s to %s', (code, character) => {
      expect(enQwertyLayout.mapKey(keyEvent(code, { shiftKey: true }), state('')).text).toBe(character)
    })
  })

  describe('punctuation', () => {
    it.each([
      ['Semicolon', ';', ':'],
      ['Quote', "'", '"'],
      ['Comma', ',', '<'],
      ['Period', '.', '>'],
      ['Slash', '/', '?'],
      ['Backslash', '\\', '|'],
      ['BracketLeft', '[', '{'],
      ['BracketRight', ']', '}'],
      ['Minus', '-', '_'],
      ['Equal', '=', '+'],
      ['Backquote', '`', '~'],
    ])('maps %s to %s and shifted to %s', (code, plain, shifted) => {
      expect(enQwertyLayout.mapKey(keyEvent(code), state('')).text).toBe(plain)
      expect(enQwertyLayout.mapKey(keyEvent(code, { shiftKey: true }), state('')).text).toBe(shifted)
    })

    it('maps the space bar to a space', () => {
      expect(enQwertyLayout.mapKey(keyEvent('Space'), state('')).text).toBe(' ')
    })
  })

  describe('control keys', () => {
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
      const result = enQwertyLayout.mapKey(keyEvent(code), state(''))
      expect(result.consumed).toBe(false)
      expect(result.text).toBe('')
      expect(result.invalid).toBe(false)
    })

    it('leaves Backspace to the typing area', () => {
      const result = enQwertyLayout.mapKey(keyEvent('Backspace'), state('abc'))
      expect(result.consumed).toBe(false)
      expect(result.text).toBe('')
    })

    it.each([
      ['ctrlKey', { ctrlKey: true }],
      ['metaKey', { metaKey: true }],
      ['altKey', { altKey: true }],
    ])('leaves %s combinations to the browser', (_label, options) => {
      const result = enQwertyLayout.mapKey(keyEvent('KeyA', options), state(''))
      expect(result.consumed).toBe(false)
      expect(result.text).toBe('')
    })
  })

  describe('unmapped keys', () => {
    it('falls back to the browser character', () => {
      const result = enQwertyLayout.mapKey(
        { key: 'é', code: 'IntlBackslash', ctrlKey: false, altKey: false, shiftKey: false, metaKey: false },
        state(''),
      )
      expect(result.text).toBe('é')
      expect(result.consumed).toBe(true)
    })

    it('marks a key it cannot map as invalid', () => {
      const result = enQwertyLayout.mapKey(
        { key: 'F13', code: 'F13', ctrlKey: false, altKey: false, shiftKey: false, metaKey: false },
        state(''),
      )
      expect(result.invalid).toBe(true)
      expect(result.consumed).toBe(false)
    })
  })

  describe('keyForCharacter', () => {
    it('finds the key for a lowercase letter', () => {
      expect(keyForCharacter('a')).toBe('KeyA')
    })

    it('finds the key for an uppercase letter', () => {
      expect(keyForCharacter('A')).toBe('KeyA')
    })

    it('finds the key for a digit', () => {
      expect(keyForCharacter('7')).toBe('Digit7')
    })

    it('finds the key for a space', () => {
      expect(keyForCharacter(' ')).toBe('Space')
    })

    it('finds the key for a shifted symbol', () => {
      expect(keyForCharacter('?')).toBe('Slash')
    })

    it('returns null for a character it does not produce', () => {
      expect(keyForCharacter('क')).toBeNull()
    })

    it('returns null for an empty string', () => {
      expect(keyForCharacter('')).toBeNull()
    })
  })

  describe('nextExpectedKey', () => {
    it('points at the key for the next character', () => {
      expect(enQwertyLayout.nextExpectedKey('the quick', 'the ')).toBe('KeyQ')
    })

    it('points at the space bar for a space', () => {
      expect(enQwertyLayout.nextExpectedKey('the quick', 'the')).toBe('Space')
    })

    it('returns null when the passage is exhausted', () => {
      expect(enQwertyLayout.nextExpectedKey('the', 'the')).toBeNull()
    })

    it('returns null for an empty passage', () => {
      expect(enQwertyLayout.nextExpectedKey('', '')).toBeNull()
    })
  })

  describe('the layout metadata', () => {
    it('is identified as the English layout', () => {
      expect(enQwertyLayout.id).toBe('en-qwerty')
      expect(enQwertyLayout.language).toBe('EN')
    })

    it('has five rows of keys', () => {
      expect(enQwertyLayout.rows).toHaveLength(5)
    })
  })
})
