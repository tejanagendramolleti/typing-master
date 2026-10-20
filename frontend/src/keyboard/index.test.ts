import { describe, expect, it } from 'vitest'
import {
  KEYBOARD_LAYOUTS,
  LAYOUT_IDS,
  enQwertyLayout,
  getLayout,
  getLayoutForLanguage,
  hiInscriptLayout,
  hiKrutiDevLayout,
  teInscriptLayout,
} from './index'

describe('the layout registry', () => {
  it('holds the four layouts the product ships with', () => {
    expect(KEYBOARD_LAYOUTS).toHaveLength(4)
  })

  it('lists the ids in order', () => {
    expect(LAYOUT_IDS).toEqual(['en-qwerty', 'hi-inscript', 'hi-krutidev', 'te-inscript'])
  })

  it('holds only layouts with a unique id', () => {
    const ids = KEYBOARD_LAYOUTS.map((layout) => layout.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('holds only layouts with a language', () => {
    for (const layout of KEYBOARD_LAYOUTS) {
      expect(layout.language).toMatch(/^[A-Z]{2}$/)
    }
  })

  it('holds only layouts with a label and a description', () => {
    for (const layout of KEYBOARD_LAYOUTS) {
      expect(layout.label.length).toBeGreaterThan(0)
      expect(layout.description.length).toBeGreaterThan(0)
    }
  })

  it('holds only layouts with at least one row of keys', () => {
    for (const layout of KEYBOARD_LAYOUTS) {
      expect(layout.rows.length).toBeGreaterThan(0)
    }
  })

  it('holds only layouts whose key codes are unique within a row', () => {
    for (const layout of KEYBOARD_LAYOUTS) {
      for (const row of layout.rows) {
        const codes = row.keys.map((key) => key.code)
        expect(new Set(codes).size).toBe(codes.length)
      }
    }
  })

  describe('getLayout', () => {
    it('finds the English layout', () => {
      expect(getLayout('en-qwerty')).toBe(enQwertyLayout)
    })

    it('finds the Hindi Inscript layout', () => {
      expect(getLayout('hi-inscript')).toBe(hiInscriptLayout)
    })

    it('finds the Kruti Dev layout', () => {
      expect(getLayout('hi-krutidev')).toBe(hiKrutiDevLayout)
    })

    it('finds the Telugu layout', () => {
      expect(getLayout('te-inscript')).toBe(teInscriptLayout)
    })

    it('falls back to English for an unknown id', () => {
      expect(getLayout('klayout')).toBe(enQwertyLayout)
    })

    it('falls back to English for a null id', () => {
      expect(getLayout(null)).toBe(enQwertyLayout)
    })

    it('falls back to English for an undefined id', () => {
      expect(getLayout(undefined)).toBe(enQwertyLayout)
    })
  })

  describe('getLayoutForLanguage', () => {
    it('finds a layout for English', () => {
      expect(getLayoutForLanguage('EN')).toBe(enQwertyLayout)
    })

    it('finds a layout for Hindi', () => {
      expect(getLayoutForLanguage('HI')).toBe(hiInscriptLayout)
    })

    it('finds a layout for Telugu', () => {
      expect(getLayoutForLanguage('TE')).toBe(teInscriptLayout)
    })

    it('falls back to English for an unknown language', () => {
      expect(getLayoutForLanguage('XX')).toBe(enQwertyLayout)
    })

    it('falls back to English for a null language', () => {
      expect(getLayoutForLanguage(null)).toBe(enQwertyLayout)
    })
  })
})
