import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { enQwertyLayout } from '../../keyboard/layouts/enQwerty'
import { hiInscriptLayout } from '../../keyboard/layouts/hiInscript'
import { keyEvent } from '../../test/helpers'
import { useTyping } from './useTyping'

/** The passage the tests type. */
const REFERENCE = 'the quick brown fox'

/**
 * Renders the typing hook with sensible defaults.
 */
function renderTyping(overrides: Partial<Parameters<typeof useTyping>[0]> = {}) {
  return renderHook(() =>
    useTyping({
      reference: REFERENCE,
      layout: enQwertyLayout,
      durationMs: 60_000,
      showLiveWpm: true,
      ...overrides,
    }),
  )
}

describe('useTyping', () => {
  it('starts with nothing typed', () => {
    const { result } = renderTyping()
    expect(result.current.text).toBe('')
    expect(result.current.keystrokes).toBe(0)
    expect(result.current.backspaces).toBe(0)
  })

  it('starts with the whole time left', () => {
    const { result } = renderTyping()
    expect(result.current.remainingMs).toBe(60_000)
  })

  it('inserts the character a key produces', () => {
    const { result } = renderTyping()
    act(() => {
      result.current.handleKey(keyEvent('KeyT'))
    })
    expect(result.current.text).toBe('t')
    expect(result.current.keystrokes).toBe(1)
  })

  it('counts every key press', () => {
    const { result } = renderTyping()
    act(() => {
      result.current.handleKey(keyEvent('KeyT'))
      result.current.handleKey(keyEvent('KeyH'))
      result.current.handleKey(keyEvent('KeyE'))
    })
    expect(result.current.text).toBe('the')
    expect(result.current.keystrokes).toBe(3)
  })

  it('removes the last character on backspace', () => {
    const { result } = renderTyping()
    act(() => {
      result.current.handleKey(keyEvent('KeyT'))
      result.current.handleKey(keyEvent('KeyH'))
    })
    expect(result.current.text).toBe('th')

    act(() => {
      result.current.handleKey(keyEvent('Backspace'))
    })
    expect(result.current.text).toBe('t')
    expect(result.current.backspaces).toBe(1)
  })

  it('counts a backspace as a key press as well', () => {
    const { result } = renderTyping()
    act(() => {
      result.current.handleKey(keyEvent('Backspace'))
    })
    expect(result.current.keystrokes).toBe(1)
    expect(result.current.backspaces).toBe(1)
  })

  it('does nothing on backspace when there is no text', () => {
    const { result } = renderTyping()
    act(() => {
      result.current.handleKey(keyEvent('Backspace'))
    })
    expect(result.current.text).toBe('')
  })

  it('records a key event for every keystroke', () => {
    const { result } = renderTyping()
    act(() => {
      result.current.handleKey(keyEvent('KeyT'))
      result.current.handleKey(keyEvent('KeyH'))
    })

    const keystrokes = result.current.events.filter((event) => event.type === 'KEYSTROKE')
    expect(keystrokes.length).toBeGreaterThanOrEqual(2)
    expect(keystrokes[0].charValue).toBe('t')
  })

  it('records a backspace event', () => {
    const { result } = renderTyping()
    act(() => {
      result.current.handleKey(keyEvent('KeyT'))
      result.current.handleKey(keyEvent('Backspace'))
    })
    expect(result.current.events.some((event) => event.type === 'BACKSPACE')).toBe(true)
  })

  it('records a cheat attempt', () => {
    const { result } = renderTyping()
    act(() => {
      result.current.markCheat('PASTE_ATTEMPT')
    })
    expect(result.current.cheatAttempted).toBe(true)
    expect(result.current.events.some((event) => event.type === 'PASTE_ATTEMPT')).toBe(true)
  })

  it('ignores a control combination', () => {
    const { result } = renderTyping()
    act(() => {
      result.current.handleKey(keyEvent('KeyT', { ctrlKey: true }))
    })
    expect(result.current.text).toBe('')
  })

  it('uses the layout to decide what a key produces', () => {
    const { result } = renderTyping({ layout: hiInscriptLayout, reference: 'क' })
    act(() => {
      result.current.handleKey(keyEvent('KeyQ'))
    })
    expect(result.current.text).toBe('क')
  })

  it('passes the reference to the layout, so a conjunct can be formed', () => {
    const { result } = renderTyping({ layout: hiInscriptLayout, reference: 'क' + '्' + 'त' })
    act(() => {
      result.current.handleKey(keyEvent('KeyQ'))
    })
    act(() => {
      result.current.handleKey(keyEvent('KeyF'))
    })
    expect(result.current.text).toBe('क' + '्' + 'त')
  })

  it('gives the layout the text and the cursor', () => {
    const { result } = renderTyping()
    act(() => {
      result.current.handleKey(keyEvent('KeyT'))
    })
    expect(result.current.layoutState.text).toBe('t')
    expect(result.current.layoutState.cursor).toBe(1)
  })

  it('gives the layout the reference', () => {
    const { result } = renderTyping()
    expect(result.current.layoutState.reference).toBe(REFERENCE)
  })

  it('shows no live speed before there is enough of a window', () => {
    const { result } = renderTyping()
    expect(result.current.liveWpm).toBeNull()
  })

  it('shows no live speed when the profile hides it', () => {
    const { result } = renderTyping({ showLiveWpm: false })
    act(() => {
      result.current.handleKey(keyEvent('KeyT'))
    })
    expect(result.current.liveWpm).toBeNull()
  })

  it('expires when the time runs out', () => {
    vi.useFakeTimers()
    const onExpire = vi.fn()
    const { result } = renderTyping({ durationMs: 1_000, onExpire })

    act(() => {
      vi.advanceTimersByTime(1_500)
    })

    expect(result.current.isExpired).toBe(true)
    expect(result.current.remainingMs).toBe(0)
    expect(onExpire).toHaveBeenCalled()
    vi.useRealTimers()
  })

  it('does not accept keys after it has expired', () => {
    vi.useFakeTimers()
    const { result } = renderTyping({ durationMs: 1_000 })

    act(() => {
      vi.advanceTimersByTime(1_500)
    })
    act(() => {
      result.current.handleKey(keyEvent('KeyT'))
    })

    expect(result.current.text).toBe('')
    vi.useRealTimers()
  })

  it('does not expire before the time is up', () => {
    vi.useFakeTimers()
    const onExpire = vi.fn()
    const { result } = renderTyping({ durationMs: 60_000, onExpire })

    act(() => {
      vi.advanceTimersByTime(5_000)
    })

    expect(result.current.isExpired).toBe(false)
    expect(onExpire).not.toHaveBeenCalled()
    vi.useRealTimers()
  })
})
