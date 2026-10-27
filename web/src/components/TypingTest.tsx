import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { buildText, DURATIONS, SCENARIOS, type ScenarioId } from '../data/passages'
import { computeStats, liveWpm, type TestStats } from '../lib/typing'
import { useKeySounds } from '../lib/sound'

export interface FinishedTest {
  stats: TestStats
  scenario: ScenarioId
  durationSeconds: number
}

interface Props {
  initialScenario?: ScenarioId
  initialDuration?: number
  onFinish: (finished: FinishedTest) => void
}

type Phase = 'ready' | 'running' | 'done'

/** Clock shown as m:ss. */
function formatClock(totalSeconds: number): string {
  const clamped = Math.max(0, Math.ceil(totalSeconds))
  return `${Math.floor(clamped / 60)}:${String(clamped % 60).padStart(2, '0')}`
}

/** Non-breaking space (char 160) — an inline-block char span collapses a plain ' '. */
const NBSP = String.fromCharCode(160)

/**
 * The typing engine — the heart of the product.
 *
 * A hidden textarea captures real keystrokes (mobile keyboards included).
 * The visible stream groups characters into words so spacing can never
 * collapse, the active word glows, and every keystroke animates with
 * color-only CSS transitions (never layout) to stay smooth past 100 WPM.
 * Keystrokes play soft synthesized sounds; unfocusing blurs the stream
 * like the best typing apps do.
 */
export function TypingTest({ initialScenario = 'everyday', initialDuration = 60, onFinish }: Props) {
  const [scenario, setScenario] = useState<ScenarioId>(initialScenario)
  const [durationSeconds, setDurationSeconds] = useState(initialDuration)
  const [phase, setPhase] = useState<Phase>('ready')
  const [typed, setTyped] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const { enabled: soundOn, toggle: toggleSound, playHit, playMiss } = useKeySounds()

  const inputRef = useRef<HTMLTextAreaElement>(null)
  const startRef = useRef(0)
  const [now, setNow] = useState(0)

  const reference = useMemo(
    () => buildText(scenario, durationSeconds),
    [scenario, durationSeconds],
  )

  const elapsed = phase === 'running' ? (now - startRef.current) / 1000 : 0
  const remaining = Math.max(0, durationSeconds - elapsed)
  const currentWpm = phase === 'running' ? liveWpm(typed.length, elapsed) : 0

  // Live accuracy for the HUD.
  let correctSoFar = 0
  for (let i = 0; i < typed.length; i += 1) {
    if (typed[i] === reference[i]) correctSoFar += 1
  }
  const liveAccuracy =
    typed.length === 0 ? 100 : Math.round((correctSoFar / typed.length) * 1000) / 10

  // ---- Lifecycle ---------------------------------------------------------

  const focusInput = useCallback(() => {
    inputRef.current?.focus()
  }, [])

  const reset = useCallback(
    (nextScenario = scenario, nextDuration = durationSeconds) => {
      setScenario(nextScenario)
      setDurationSeconds(nextDuration)
      setPhase('ready')
      setTyped('')
      startRef.current = 0
      setNow(0)
      requestAnimationFrame(() => inputRef.current?.focus())
    },
    [scenario, durationSeconds],
  )

  const finish = useCallback(() => {
    const elapsedSeconds = Math.max((Date.now() - startRef.current) / 1000, 1)
    const stats = computeStats(typed, reference, elapsedSeconds)
    setPhase('done')
    onFinish({ stats, scenario, durationSeconds })
  }, [typed, reference, scenario, durationSeconds, onFinish])

  // The 100ms ticker drives the clock, HUD and auto-finish.
  useEffect(() => {
    if (phase !== 'running') return
    const id = window.setInterval(() => {
      const elapsedMs = Date.now() - startRef.current
      setNow(Date.now())
      if (elapsedMs >= durationSeconds * 1000) finish()
    }, 100)
    return () => window.clearInterval(id)
  }, [phase, durationSeconds, finish])

  // Focus on mount so desktop users can just start typing.
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // ---- Input ---------------------------------------------------------------

  const beginIfReady = useCallback(() => {
    if (phase === 'ready') {
      startRef.current = Date.now()
      setNow(Date.now())
      setPhase('running')
    }
  }, [phase])

  const handleChange = useCallback(
    (value: string) => {
      if (phase === 'done') return
      beginIfReady()
      // Clamp to the reference length — no runaway input past the text.
      const next = value.slice(0, reference.length)
      // One sound per newly added character: blip for hits, thud for misses.
      if (next.length > typed.length) {
        for (let i = typed.length; i < next.length; i += 1) {
          if (next[i] === reference[i]) playHit()
          else playMiss()
        }
      }
      setTyped(next)
    },
    [phase, beginIfReady, reference, typed.length, playHit, playMiss],
  )

  const handlePaste = useCallback((event: React.ClipboardEvent) => {
    // Paste would fake the score; block it and keep focus.
    event.preventDefault()
    inputRef.current?.focus()
  }, [])

  // Keep focus while running, even if the user clicks the panel.
  useEffect(() => {
    if (phase === 'running') inputRef.current?.focus()
  }, [phase])

  // ---- Rendering the stream --------------------------------------------------

  // Only render a window around the cursor so 5-minute texts stay fast.
  // The window is clamped so the cursor is always inside it.
  const WINDOW = 900
  const windowStart = Math.max(0, Math.min(typed.length - 200, Math.max(0, reference.length - WINDOW)))
  const windowEnd = Math.min(reference.length, windowStart + WINDOW)
  const slice = reference.slice(windowStart, windowEnd)

  const activeRef = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [typed.length])

  /**
   * Word-grouped stream. Spaces render as non-breaking spaces (an
   * inline-block span collapses plain spaces to zero width), and the word
   * under the cursor gets the active glow.
   */
  const stream = useMemo(() => {
    const nodes: React.ReactNode[] = []
    const tokens = slice.split(/(\s+)/)
    let offset = windowStart
    for (const token of tokens) {
      if (token.length === 0) continue
      if (/^\s+$/.test(token)) {
        // Separator run — one visible gap per space, keeps hit/miss color.
        for (let k = 0; k < token.length; k += 1) {
          const index = offset + k
          const typedCh = typed[index]
          const state = typedCh === undefined ? 'pending' : typedCh === token[k] ? 'hit' : 'miss'
          nodes.push(
            <span key={`s-${index}`} className={`stream-char is-${state}`}>
              {NBSP}
            </span>,
          )
        }
        offset += token.length
        continue
      }
      const wordStart = offset
      const wordEnd = offset + token.length
      const cursor = typed.length
      const isActiveWord = cursor >= wordStart && cursor <= wordEnd
      const chars = token.split('').map((ch, k) => {
        const index = wordStart + k
        const typedCh = typed[index]
        const state = typedCh === undefined ? 'pending' : typedCh === ch ? 'hit' : 'miss'
        const isCurrent = index === cursor
        return (
          <span
            key={index}
            ref={isCurrent ? activeRef : undefined}
            className={`stream-char is-${state}${isCurrent ? ' is-current' : ''}`}
          >
            {ch}
            {isCurrent && <span aria-hidden="true" className="caret" />}
          </span>
        )
      })
      nodes.push(
        <span key={`w-${wordStart}`} className={`tw-word${isActiveWord ? ' tw-word-active' : ''}`}>
          {chars}
        </span>,
      )
      offset = wordEnd
    }
    return nodes
  }, [slice, windowStart, typed])

  const urgent = phase === 'running' && remaining <= 10
  const progress = Math.min(1, typed.length / reference.length)
  const blurred = !isFocused && phase !== 'done'

  return (
    <section aria-label="Typing test" className="panel relative overflow-hidden p-5 sm:p-8">
      {/* Hidden input: the single source of keystrokes. */}
      <textarea
        ref={inputRef}
        value={typed}
        onChange={(e) => handleChange(e.target.value)}
        onPaste={handlePaste}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        autoCapitalize="off"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        aria-label="Type the text shown above here"
        className="absolute h-px w-px opacity-0"
        style={{ top: 0, left: 0 }}
      />

      {/* ---- Pickers ---- */}
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Test duration">
        {DURATIONS.map((d) => (
          <button
            key={d.seconds}
            type="button"
            className="pill"
            aria-pressed={durationSeconds === d.seconds}
            onClick={() => reset(scenario, d.seconds)}
          >
            {d.label}
          </button>
        ))}
      </div>
      <div
        className="mt-3 flex flex-wrap items-center gap-2"
        role="group"
        aria-label="Test scenario"
      >
        {SCENARIOS.map((s) => (
          <button
            key={s.id}
            type="button"
            className="pill"
            aria-pressed={scenario === s.id}
            title={s.blurb}
            onClick={() => reset(s.id, durationSeconds)}
          >
            {s.name}
          </button>
        ))}
      </div>

      {/* ---- HUD ---- */}
      <div className="mt-6 flex items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="chip font-mono tabular-nums" aria-label="Live words per minute">
            <span aria-hidden="true" className="h-1.5 w-1.5 animate-pulse rounded-full bg-neon-400" />
            {currentWpm} WPM
          </span>
          <span className="chip font-mono tabular-nums" aria-label="Live accuracy">
            {liveAccuracy}% acc
          </span>
          <button
            type="button"
            onClick={toggleSound}
            aria-pressed={soundOn}
            aria-label={soundOn ? 'Mute keystroke sounds' : 'Enable keystroke sounds'}
            title={soundOn ? 'Mute sounds' : 'Enable sounds'}
            className="chip cursor-pointer font-mono transition-colors hover:border-neon-400/40 hover:text-white"
          >
            <svg
              aria-hidden="true"
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M11 5 6 9H2v6h4l5 4V5z" />
              {soundOn ? (
                <>
                  <path d="M15.5 8.5a5 5 0 0 1 0 7" />
                  <path d="M18.5 5.5a9.4 9.4 0 0 1 0 13" />
                </>
              ) : (
                <>
                  <line x1="16" y1="9" x2="22" y2="15" />
                  <line x1="22" y1="9" x2="16" y2="15" />
                </>
              )}
            </svg>
            {soundOn ? 'sound on' : 'muted'}
          </button>
        </div>
        <div
          role="timer"
          aria-label="Time remaining"
          className={`font-mono text-2xl font-bold tabular-nums sm:text-3xl ${
            urgent ? 'text-rose-300' : 'text-white text-glow'
          }`}
        >
          {phase === 'ready' ? formatClock(durationSeconds) : formatClock(remaining)}
        </div>
      </div>

      {/* Progress hairline */}
      <div
        aria-hidden="true"
        className="mt-3 h-1 overflow-hidden rounded-full bg-white/10"
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-neon-400 to-pulse-500 transition-[width] duration-150 ease-out"
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      {/* ---- The stream ---- */}
      <button
        type="button"
        onClick={focusInput}
        aria-label="Focus the typing area"
        className="relative mt-5 block max-h-72 w-full cursor-text overflow-y-auto rounded-xl border border-white/5 bg-void-950/60 p-5 text-left font-mono text-xl leading-[2.4] tracking-tight sm:p-6 sm:text-2xl"
      >
        {phase === 'ready' && isFocused && (
          <span className="mb-3 block font-sans text-sm text-slate-400">
            Start typing — the clock begins on your first keystroke.
          </span>
        )}
        <span className={blurred ? 'tw-blurred' : undefined} aria-hidden={blurred}>
          {windowStart > 0 && <span className="text-slate-600">… </span>}
          {stream}
          {windowEnd < reference.length && <span className="text-slate-600"> …</span>}
        </span>
        {blurred && (
          <span className="tw-focus-hint">
            <svg
              aria-hidden="true"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 3l14 7-6.5 1.5L9 18z" />
            </svg>
            Click here, then start typing
          </span>
        )}
      </button>

      {/* ---- Controls ---- */}
      <div className="mt-5 flex flex-wrap items-center gap-2">
        {phase === 'running' ? (
          <button type="button" className="btn-neon btn-sm" onClick={finish}>
            Finish now
          </button>
        ) : (
          <button type="button" className="btn-neon btn-sm" onClick={focusInput}>
            {phase === 'done' ? 'Type again' : 'Start typing'}
          </button>
        )}
        <button type="button" className="btn-ghost btn-sm" onClick={() => reset()}>
          Restart
        </button>
        <span className="ml-auto hidden text-xs text-slate-500 sm:inline">
          Paste is disabled to keep scores honest · {SCENARIOS.find((s) => s.id === scenario)?.blurb}
        </span>
      </div>

      <p aria-live="polite" className="sr-only">
        {phase === 'running' ? `${Math.ceil(remaining)} seconds remaining` : ''}
      </p>
    </section>
  )
}
