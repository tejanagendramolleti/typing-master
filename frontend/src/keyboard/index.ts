import type { KeyboardLayout } from './types'
import { enQwertyLayout } from './layouts/enQwerty'
import { hiInscriptLayout } from './layouts/hiInscript'
import { hiKrutiDevLayout } from './layouts/hiKrutiDev'
import { teInscriptLayout } from './layouts/teInscript'

/**
 * Every layout the application knows about.
 *
 * The registry is the only place that needs to change when a layout is
 * added — everything else looks a layout up by its id.
 */
export const KEYBOARD_LAYOUTS: readonly KeyboardLayout[] = [
  enQwertyLayout,
  hiInscriptLayout,
  hiKrutiDevLayout,
  teInscriptLayout,
]

/**
 * Looks a layout up by its id.
 *
 * @param id the layout id, as stored on `ExamProfile.keyboardLayout`
 * @returns the layout, or the English one when the id is unknown
 */
export function getLayout(id: string | null | undefined): KeyboardLayout {
  if (!id) return enQwertyLayout
  const found = KEYBOARD_LAYOUTS.find((layout) => layout.id === id)
  return found ?? enQwertyLayout
}

/**
 * Looks a layout up by the language it serves.
 *
 * @param language the language code, for example `HI`
 * @returns the first layout for that language, or the English one
 */
export function getLayoutForLanguage(language: string | null | undefined): KeyboardLayout {
  if (!language) return enQwertyLayout
  const found = KEYBOARD_LAYOUTS.find((layout) => layout.language === language)
  return found ?? enQwertyLayout
}

/** The ids of every registered layout. */
export const LAYOUT_IDS = KEYBOARD_LAYOUTS.map((layout) => layout.id)

export { enQwertyLayout, hiInscriptLayout, hiKrutiDevLayout, teInscriptLayout }
export * from './types'
