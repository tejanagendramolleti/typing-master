import '@testing-library/jest-dom/vitest'
import { afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

/**
 * The test setup shared by every frontend test.
 *
 * jsdom does not implement the browser APIs the typing screen relies on, so
 * they are stubbed here rather than in each test file.
 */

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

// jsdom has no layout engine, so anything that measures the element returns
// zero. The typing screen only uses this for the caret, and zero is fine.
if (typeof Element.prototype.scrollIntoView !== 'function') {
  Element.prototype.scrollIntoView = function scrollIntoView() {
    return undefined
  }
}

if (!window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  })) as typeof window.matchMedia
}

if (!globalThis.ResizeObserver) {
  globalThis.ResizeObserver = class {
    observe() {
      return undefined
    }
    unobserve() {
      return undefined
    }
    disconnect() {
      return undefined
    }
  } as unknown as typeof ResizeObserver
}
