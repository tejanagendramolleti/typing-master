import type { KeyEvent, LayoutOutput, LayoutState } from '../keyboard/types'

/**
 * Builds a key event for a physical key.
 *
 * @param code the physical key, for example `KeyQ`
 * @param options the modifiers
 */
export function keyEvent(code: string, options: Partial<KeyEvent> = {}): KeyEvent {
  return {
    key: options.key ?? code,
    code,
    ctrlKey: options.ctrlKey ?? false,
    altKey: options.altKey ?? false,
    shiftKey: options.shiftKey ?? false,
    metaKey: options.metaKey ?? false,
  }
}

/**
 * Builds the typing state.
 *
 * @param text what has been typed
 * @param reference the passage being typed, when the layout needs it
 */
export function state(text: string, reference?: string): LayoutState {
  return { text, cursor: text.length, reference }
}

/**
 * Maps one key and returns just the text it produces.
 */
export function mappedText(
  layout: { mapKey(event: KeyEvent, state: LayoutState): LayoutOutput },
  code: string,
  text: string,
  options: Partial<KeyEvent> & { reference?: string } = {},
): string {
  const { reference, ...eventOptions } = options
  return layout.mapKey(keyEvent(code, eventOptions), state(text, reference)).text
}
