/**
 * The keyboard layout abstraction.
 *
 * A layout is data plus a small mapper: given a key event and the current
 * composition state, it says what character to insert, whether the key was
 * consumed, and which key the candidate should press next.
 *
 * Adding a new layout means adding a data table and a mapper — nothing else in
 * the application needs to change.
 */

/** The physical key that was pressed. */
export interface KeyEvent {
  /** `event.key` — the character the browser produced, or a named key. */
  key: string
  /** `event.code` — the physical key, independent of layout. */
  code: string
  ctrlKey: boolean
  altKey: boolean
  shiftKey: boolean
  metaKey: boolean
}

/** The state a layout keeps while the candidate is typing. */
export interface LayoutState {
  /** Characters the candidate has typed so far. */
  text: string
  /** The index into `text` where the next character will be inserted. */
  cursor: number
  /**
   * The passage the candidate is typing, when one is available.
   *
   * Indic layouts use this to decide whether a conjunct needs a halant. A
   * layout must never use it to decide *which* character to insert — only
   * whether a joining mark is required — otherwise the test would measure
   * copying rather than typing. See `DECISIONS.md` D18.
   */
  reference?: string
}

/** The result of mapping one key event. */
export interface LayoutOutput {
  /** The text to insert, or an empty string when nothing is produced. */
  text: string
  /** True when the layout handled the key and the browser default should be suppressed. */
  consumed: boolean
  /**
   * The physical key that should be pressed next, for the on-screen keyboard
   * hint. Null when the layout cannot tell.
   */
  nextHintKey: string | null
  /** True when the key could not be mapped. */
  invalid: boolean
  /**
   * True when `text` should replace the character immediately before the
   * cursor instead of being inserted after it.
   *
   * Kruti Dev needs this: in the legacy font, typing an independent vowel
   * straight after a consonant replaces the consonant rather than following
   * it.
   */
  replacePrevious?: boolean
}

/** A key as it appears on the on-screen keyboard. */
export interface LayoutKey {
  /** The physical `KeyboardEvent.code`. */
  code: string
  /** The main label. */
  label: string
  /** An optional secondary label, for layouts with shifted variants. */
  shiftLabel?: string
  /** A third line used by Indic layouts for the matra or conjunct hint. */
  subLabel?: string
  /** The CSS width class, for the wide keys. */
  width?: number
  /** True when the key is a modifier that the layout ignores. */
  modifier?: boolean
}

/** A row of keys in the on-screen keyboard. */
export interface LayoutRow {
  keys: LayoutKey[]
}

/** A complete keyboard layout. */
export interface KeyboardLayout {
  /** Stable identifier, matched by `ExamProfile.keyboardLayout`. */
  id: string
  /** Display name. */
  label: string
  /** The language this layout is for. */
  language: string
  /** A short description shown under the label. */
  description: string
  /** The physical key rows, for the on-screen keyboard. */
  rows: LayoutRow[]
  /**
   * Maps a key event to the text it produces.
   *
   * @param event the key event
   * @param state the current typing state
   * @returns what to insert and how to update the state
   */
  mapKey(event: KeyEvent, state: LayoutState): LayoutOutput
  /**
   * The key that should be pressed next, for the on-screen keyboard hint.
   *
   * @param reference the passage being typed
   * @param typed what the candidate has typed so far
   * @returns the physical key code, or null when it cannot be determined
   */
  nextExpectedKey(reference: string, typed: string): string | null
}

/** A layout output that does nothing. */
export const NO_OUTPUT: LayoutOutput = {
  text: '',
  consumed: false,
  nextHintKey: null,
  invalid: false,
}

/** Builds an output that inserts text. */
export function output(
  text: string,
  options: {
    consumed?: boolean
    nextHintKey?: string | null
    invalid?: boolean
    replacePrevious?: boolean
  } = {},
): LayoutOutput {
  return {
    text,
    consumed: options.consumed ?? true,
    nextHintKey: options.nextHintKey ?? null,
    invalid: options.invalid ?? false,
    ...(options.replacePrevious ? { replacePrevious: true } : {}),
  }
}
