import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { buildText, DURATIONS, SCENARIOS, type ScenarioId } from '../data/passages'
import { computeStats, liveWpm, type TestStats } from '../lib/typing'

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

/**
 * The typing engine — the heart of the product.
 *
 * A hidden textarea captures real keystrokes (mobile keyboards included);
 * the visible stream is per-character spans so every keystroke animates
 * independently with transform/opacity-safe CSS only. The caret is a glowing
 * bar that rides the current character, and the active word scrolls into
 * view with smooth behavior.
 */
export function TypingTest({ initialScenario = 'everyday', initialDuration = 60, onFinish }: Props) {
  const [scenario, setScenario] = useState<ScenarioId>(initialScenario)
  const [durationSeconds, setDurationSeconds] = useState(initialDuration)
  const [phase, setPhase] = useState<Phase>('ready')
  const [typed, setTyped] = useState('')

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

  // ---- Lifecycle ---------------------------------------------------------

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
      setTyped(value.slice(0, reference.length))
    },
    [phase, beginIfReady, reference.length],
  )

  const handlePaste = useCallback((event: React.ClipboardEvent) => {
    // Paste would fake the score; block it and keep focus.
    event.preventDefault()
    inputRef.current?.focus()
  }, [])

  const focusInput = useCallback(() => {
    inputRef.current?.focus()
  }, [])

  // Keep focus while running, even if the user clicks the panel.
  useEffect(() => {
    if (phase === 'running') inputRef.current?.focus()
  }, [phase])

  // ---- Rendering the stream --------------------------------------------------

  // Only render a window around the cursor so 5-minute texts stay fast.
  const WINDOW = 900
  const windowStart = Math.max(0, typed.length - 200)
  const windowEnd = Math.min(reference.length, windowStart + WINDOW)
  const slice = reference.slice(windowStart, windowEnd)

  const activeRef = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [typed.length])

  const urgent = phase === 'running' && remaining <= 10
  const progress = Math.min(1, typed.length / reference.length)

  return (
    <section aria-label="Typing test" className="panel relative overflow-hidden p-5 sm:p-8">
      {/* Hidden input: the single source of keystrokes. */}
      <textarea
        ref={inputRef}
        value={typed}
        onChange={(e) => handleChange(e.target.value)}
        onPaste={handlePaste}
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
        <div className="flex items-center gap-2">
          <span className="chip font-mono tabular-nums" aria-label="Live words per minute">
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-neon-400" />
            {currentWpm} WPM
          </span>
          <span className="chip hidden font-mono tabular-nums sm:inline-flex">
            {typed.length} chars
          </span>
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
        className="mt-5 block max-h-64 w-full cursor-text overflow-y-auto rounded-xl bg-void-950/60 p-5 text-left font-mono text-lg leading-[2.1] tracking-tight sm:text-xl"
      >
        {phase === 'ready' && (
          <span className="mb-3 block font-sans text-sm text-slate-400">
            Click here and start typing — the clock begins on your first keystroke.
          </span>
        )}
        {windowStart > 0 && <span className="text-slate-600">…</span>}
        {slice.split('').map((ch, i) => {
          const index = windowStart + i
          const typedCh = typed[index]
          const state =
            typedCh === undefined ? 'pending' : typedCh === ch ? 'hit' : 'miss'
          const isCurrent = index === typed.length
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
        })}
        {windowEnd < reference.length && <span className="text-slate-600"> …</span>}
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
