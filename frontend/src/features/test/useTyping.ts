import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardLayout, KeyEvent, LayoutState } from '../../keyboard/types'
import type { TimingEvent, TimingEventType } from '../../lib/types'

/** How often the live speed is recomputed, in milliseconds. */
const TICK_INTERVAL_MS = 500

/** The state the typing hook exposes. */
export interface TypingState {
  /** What the candidate has typed. */
  text: string
  /** The number of keys pressed, backspaces included. */
  keystrokes: number
  /** The number of backspace presses. */
  backspaces: number
  /** The time left, in milliseconds. */
  remainingMs: number
  /** The speed over the last window, in words a minute. Null when unknown. */
  liveWpm: number | null
  /** True when the time has run out. */
  isExpired: boolean
}

/** What the typing hook exposes. */
export interface TypingApi extends TypingState {
  /** Records a key event and returns the text to insert, if any. */
  handleKey(event: KeyEvent): string
  /** The events recorded so far, for the server. */
  events: TimingEvent[]
  /** The current state, for the layout. */
  layoutState: LayoutState
  /** True when the candidate tried to paste, drop, copy or use the context menu. */
  cheatAttempted: boolean
  /** Records a cheat attempt against the test. */
  markCheat(type: TimingEventType): void
}

/**
 * The typing hook.
 *
 * It owns the typed text, the timing events and the clock. The layout
 * decides what a key press produces; this hook decides what happens next.
 *
 * The elapsed time is measured from the moment the test started, not from a
 * count of keystrokes, so a candidate who stops to think is not rewarded.
 */
export function useTyping(options: {
  /** The passage being typed. */
  reference: string
  /** The layout that maps the keys. */
  layout: KeyboardLayout
  /** How long the test runs for, in milliseconds. */
  durationMs: number
  /** True when the live speed should be shown. */
  showLiveWpm: boolean
  /** Called when the time runs out. */
  onExpire?: () => void
  /** The attempt id, so the layout knows which attempt it is. */
  attemptId?: number
}): TypingApi {
  const { reference, layout, durationMs, showLiveWpm, onExpire } = options

  const [text, setText] = useState('')
  const [keystrokes, setKeystrokes] = useState(0)
  const [backspaces, setBackspaces] = useState(0)
  const [remainingMs, setRemainingMs] = useState(durationMs)
  const [isExpired, setIsExpired] = useState(false)
  const [cheatAttempted, setCheatAttempted] = useState(false)

  const eventsRef = useRef<TimingEvent[]>([])
  const startedAtRef = useRef<number>(Date.now())
  const expiredRef = useRef(false)

  // The reference and the layout change when a test is resumed or switched.
  useEffect(() => {
    startedAtRef.current = Date.now()
    expiredRef.current = false
    setIsExpired(false)
    setRemainingMs(durationMs)
  }, [durationMs, reference])

  // The clock.
  useEffect(() => {
    if (isExpired) return

    const timer = window.setInterval(() => {
      const elapsed = Date.now() - startedAtRef.current
      const left = Math.max(0, durationMs - elapsed)
      setRemainingMs(left)
      if (left <= 0 && !expiredRef.current) {
        expiredRef.current = true
        setIsExpired(true)
        onExpire?.()
      }
    }, TICK_INTERVAL_MS)

    return () => window.clearInterval(timer)
  }, [durationMs, isExpired, onExpire])

  /** Records an event with the time it happened. */
  const record = useCallback((type: TimingEventType, charIndex?: number, charValue?: string, keyCode?: string) => {
    eventsRef.current.push({
      type,
      offsetMs: Date.now() - startedAtRef.current,
      charIndex: charIndex ?? null,
      charValue: charValue ?? null,
      keyCode: keyCode ?? null,
    })
  }, [])

  const layoutState = useMemo<LayoutState>(
    () => ({ text, cursor: text.length, reference }),
    [text, reference],
  )

  /**
   * Records a key press and returns the text to insert.
   */
  const handleKey = useCallback(
    (event: KeyEvent): string => {
      if (expiredRef.current) return ''

      // Backspace is handled by the hook rather than the layout, because the
      // backspace key has to work the same way in every language.
      if (event.code === 'Backspace') {
        if (event.ctrlKey || event.metaKey || event.altKey) return ''
        setBackspaces((count) => count + 1)
        setKeystrokes((count) => count + 1)
        record('BACKSPACE', undefined, undefined, event.code)
        setText((current) => {
          const next = current.slice(0, -1)
          record('KEYSTROKE', next.length, '', event.code)
          return next
        })
        return ''
      }

      const result = layout.mapKey(event, layoutState)
      if (!result.consumed) return ''

      if (result.invalid) {
        record('KEYSTROKE', text.length, '', event.code)
        setKeystrokes((count) => count + 1)
        return ''
      }

      if (result.text.length > 0) {
        setKeystrokes((count) => count + 1)
        record('KEYSTROKE', text.length, result.text, event.code)
        setText((current) => current + result.text)
      }

      return result.text
    },
    [layout, layoutState, record, text],
  )

  /** Records a cheat attempt. */
  const markCheat = useCallback(
    (type: TimingEventType) => {
      setCheatAttempted(true)
      record(type)
    },
    [record],
  )

  /**
   * The live speed, over the last ten seconds.
   *
   * A short window is used rather than the whole test, so the number moves
   * while the candidate is typing and shows the speed they are sustaining
   * right now.
   *
   * This is computed on every render rather than being memoised, because the
   * recorded events live in a ref and a memo would not know they had
   * changed. The render itself is the signal: a keystroke changes the text,
   * and the clock ticks every half second.
   */
  const liveWpm = (() => {
    if (!showLiveWpm) return null

    const now = Date.now() - startedAtRef.current
    const windowMs = Math.min(now, 10_000)
    if (windowMs < 2_000) return null

    // The characters typed in the window, taken from the recorded events.
    const inWindow = eventsRef.current.filter(
      (event) =>
        event.type === 'KEYSTROKE' &&
        event.offsetMs >= now - windowMs &&
        event.charValue !== null &&
        event.charValue !== undefined,
    )

    const characters = inWindow.reduce((total, event) => total + (event.charValue?.length ?? 0), 0)
    if (characters === 0) return null

    const minutes = windowMs / 60_000
    const words = characters / 5
    return Math.round(words / minutes)
  })()

  return {
    text,
    keystrokes,
    backspaces,
    remainingMs,
    liveWpm,
    isExpired,
    events: eventsRef.current,
    layoutState,
    cheatAttempted,
    handleKey,
    markCheat,
  }
}
