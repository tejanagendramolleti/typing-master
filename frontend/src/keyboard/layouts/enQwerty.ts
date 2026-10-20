import type { KeyboardLayout, KeyEvent, LayoutOutput, LayoutState } from '../types'
import { output } from '../types'

/**
 * The standard QWERTY layout.
 *
 * English needs no mapping at all — the browser already produces the right
 * character. The layout exists so that every language goes through the same
 * interface, and so that the on-screen keyboard can be drawn from the same
 * table.
 */

/** The unshifted characters, by physical key. */
const BASE: Record<string, string> = {
  KeyA: 'a', KeyB: 'b', KeyC: 'c', KeyD: 'd', KeyE: 'e', KeyF: 'f', KeyG: 'g',
  KeyH: 'h', KeyI: 'i', KeyJ: 'j', KeyK: 'k', KeyL: 'l', KeyM: 'm', KeyN: 'n',
  KeyO: 'o', KeyP: 'p', KeyQ: 'q', KeyR: 'r', KeyS: 's', KeyT: 't', KeyU: 'u',
  KeyV: 'v', KeyW: 'w', KeyX: 'x', KeyY: 'y', KeyZ: 'z',
  Digit1: '1', Digit2: '2', Digit3: '3', Digit4: '4', Digit5: '5',
  Digit6: '6', Digit7: '7', Digit8: '8', Digit9: '9', Digit0: '0',
  Space: ' ',
  Minus: '-', Equal: '=', BracketLeft: '[', BracketRight: ']',
  Backslash: '\\', Semicolon: ';', Quote: "'", Backquote: '`',
  Comma: ',', Period: '.', Slash: '/',
}

/** The shifted characters, by physical key. */
const SHIFTED: Record<string, string> = {
  KeyA: 'A', KeyB: 'B', KeyC: 'C', KeyD: 'D', KeyE: 'E', KeyF: 'F', KeyG: 'G',
  KeyH: 'H', KeyI: 'I', KeyJ: 'J', KeyK: 'K', KeyL: 'L', KeyM: 'M', KeyN: 'N',
  KeyO: 'O', KeyP: 'P', KeyQ: 'Q', KeyR: 'R', KeyS: 'S', KeyT: 'T', KeyU: 'U',
  KeyV: 'V', KeyW: 'W', KeyX: 'X', KeyY: 'Y', KeyZ: 'Z',
  Digit1: '!', Digit2: '@', Digit3: '#', Digit4: '$', Digit5: '%',
  Digit6: '^', Digit7: '&', Digit8: '*', Digit9: '(', Digit0: ')',
  Minus: '_', Equal: '+', BracketLeft: '{', BracketRight: '}',
  Backslash: '|', Semicolon: ':', Quote: '"', Backquote: '~',
  Comma: '<', Period: '>', Slash: '?',
}

/** Keys the layout handles itself rather than letting the browser do it. */
const CONTROL_KEYS = new Set([
  'Backspace', 'Tab', 'Enter', 'Escape', 'ShiftLeft', 'ShiftRight',
  'ControlLeft', 'ControlRight', 'AltLeft', 'AltRight',
  'MetaLeft', 'MetaRight', 'CapsLock', 'ContextMenu',
])

/**
 * Works out which physical key produces a given character.
 *
 * Used to highlight the next key on the on-screen keyboard.
 */
export function keyForCharacter(character: string): string | null {
  if (!character) return null
  if (character === ' ') return 'Space'
  for (const [code, value] of Object.entries(BASE)) {
    if (value === character) return code
  }
  for (const [code, value] of Object.entries(SHIFTED)) {
    if (value === character) return code
  }
  return null
}

export const enQwertyLayout: KeyboardLayout = {
  id: 'en-qwerty',
  label: 'English (QWERTY)',
  language: 'EN',
  description: 'Standard US QWERTY with the numeric row.',

  rows: [
    {
      keys: [
        { code: 'Backquote', label: '`', shiftLabel: '~' },
        { code: 'Digit1', label: '1', shiftLabel: '!' },
        { code: 'Digit2', label: '2', shiftLabel: '@' },
        { code: 'Digit3', label: '3', shiftLabel: '#' },
        { code: 'Digit4', label: '4', shiftLabel: '$' },
        { code: 'Digit5', label: '5', shiftLabel: '%' },
        { code: 'Digit6', label: '6', shiftLabel: '^' },
        { code: 'Digit7', label: '7', shiftLabel: '&' },
        { code: 'Digit8', label: '8', shiftLabel: '*' },
        { code: 'Digit9', label: '9', shiftLabel: '(' },
        { code: 'Digit0', label: '0', shiftLabel: ')' },
        { code: 'Minus', label: '-', shiftLabel: '_' },
        { code: 'Equal', label: '=', shiftLabel: '+' },
        { code: 'Backspace', label: '⌫', width: 2, modifier: true },
      ],
    },
    {
      keys: [
        { code: 'Tab', label: 'Tab', width: 1.5, modifier: true },
        { code: 'KeyQ', label: 'Q', shiftLabel: 'q' },
        { code: 'KeyW', label: 'W', shiftLabel: 'w' },
        { code: 'KeyE', label: 'E', shiftLabel: 'e' },
        { code: 'KeyR', label: 'R', shiftLabel: 'r' },
        { code: 'KeyT', label: 'T', shiftLabel: 't' },
        { code: 'KeyY', label: 'Y', shiftLabel: 'y' },
        { code: 'KeyU', label: 'U', shiftLabel: 'u' },
        { code: 'KeyI', label: 'I', shiftLabel: 'i' },
        { code: 'KeyO', label: 'O', shiftLabel: 'o' },
        { code: 'KeyP', label: 'P', shiftLabel: 'p' },
        { code: 'BracketLeft', label: '[', shiftLabel: '{' },
        { code: 'BracketRight', label: ']', shiftLabel: '}' },
        { code: 'Backslash', label: '\\', shiftLabel: '|', width: 1.5 },
      ],
    },
    {
      keys: [
        { code: 'CapsLock', label: 'Caps', width: 1.75, modifier: true },
        { code: 'KeyA', label: 'A', shiftLabel: 'a' },
        { code: 'KeyS', label: 'S', shiftLabel: 's' },
        { code: 'KeyD', label: 'D', shiftLabel: 'd' },
        { code: 'KeyF', label: 'F', shiftLabel: 'f' },
        { code: 'KeyG', label: 'G', shiftLabel: 'g' },
        { code: 'KeyH', label: 'H', shiftLabel: 'h' },
        { code: 'KeyJ', label: 'J', shiftLabel: 'j' },
        { code: 'KeyK', label: 'K', shiftLabel: 'k' },
        { code: 'KeyL', label: 'L', shiftLabel: 'l' },
        { code: 'Semicolon', label: ';', shiftLabel: ':' },
        { code: 'Quote', label: "'", shiftLabel: '"' },
        { code: 'Enter', label: '⏎', width: 2.25, modifier: true },
      ],
    },
    {
      keys: [
        { code: 'ShiftLeft', label: 'Shift', width: 2.25, modifier: true },
        { code: 'KeyZ', label: 'Z', shiftLabel: 'z' },
        { code: 'KeyX', label: 'X', shiftLabel: 'x' },
        { code: 'KeyC', label: 'C', shiftLabel: 'c' },
        { code: 'KeyV', label: 'V', shiftLabel: 'v' },
        { code: 'KeyB', label: 'B', shiftLabel: 'b' },
        { code: 'KeyN', label: 'N', shiftLabel: 'n' },
        { code: 'KeyM', label: 'M', shiftLabel: 'm' },
        { code: 'Comma', label: ',', shiftLabel: '<' },
        { code: 'Period', label: '.', shiftLabel: '>' },
        { code: 'Slash', label: '/', shiftLabel: '?' },
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

  mapKey(event: KeyEvent, _state: LayoutState): LayoutOutput {
    if (CONTROL_KEYS.has(event.code)) {
      // Let the browser handle navigation and control keys, except Backspace,
      // which the typing area needs to receive.
      if (event.code === 'Backspace') {
        return output('', { consumed: false })
      }
      return { text: '', consumed: false, nextHintKey: null, invalid: false }
    }

    if (event.ctrlKey || event.metaKey || event.altKey) {
      return { text: '', consumed: false, nextHintKey: null, invalid: false }
    }

    const table = event.shiftKey ? SHIFTED : BASE
    const mapped = table[event.code]
    if (mapped !== undefined) {
      return output(mapped)
    }

    // Fall back to the browser's own character for anything not in the table
    // (an IME, an accented character, a dead key).
    if (event.key && event.key.length === 1) {
      return output(event.key)
    }
    return { text: '', consumed: false, nextHintKey: null, invalid: true }
  },

  nextExpectedKey(reference: string, typed: string): string | null {
    const expected = reference.slice(typed.length)
    if (!expected) return null
    return keyForCharacter(expected[0])
  },
}
