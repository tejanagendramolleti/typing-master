import { useState } from 'react'
import { SCENARIOS } from '../data/passages'
import type { TestStats } from '../lib/typing'

interface Props {
  stats: TestStats
  scenarioName: string
  durationLabel: string
  isPersonalBest: boolean
  onRetry: () => void
}

/** Grade bands — a small, memorable verdict unique to this app. */
function rankFor(wpm: number, accuracy: number): { title: string; detail: string } {
  if (accuracy < 85) return { title: 'Recalibrating', detail: 'Slow down a touch — accuracy first, speed follows.' }
  if (wpm < 25) return { title: 'Warming Up', detail: 'Every expert started here. Keep the rhythm steady.' }
  if (wpm < 40) return { title: 'Cruising', detail: 'Around average. Push for 40+ with daily 3-minute runs.' }
  if (wpm < 60) return { title: 'Gliding', detail: 'Solid speed. Shorter bursts will sharpen your top gear.' }
  if (wpm < 80) return { title: 'Flying', detail: 'Genuinely fast. Punctuation+ mode is your next boss.' }
  return { title: 'Hyperspeed', detail: 'Elite territory. Fewer than 1 in 50 typists reach this.' }
}

/**
 * Results: big WPM, accuracy, character split, rank and share.
 * Animated entrance (rise) so the finish feels like a reward.
 */
export function ResultsPanel({ stats, scenarioName, durationLabel, isPersonalBest, onRetry }: Props) {
  const [copied, setCopied] = useState(false)
  const rank = rankFor(stats.netWpm, stats.accuracy)

  const shareText = `I typed ${stats.netWpm} WPM with ${stats.accuracy}% accuracy on Typing Test (${durationLabel}, ${scenarioName}). Can you beat me?`

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareText)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      /* Clipboard unavailable — the text is still visible below. */
    }
  }

  return (
    <section aria-label="Your result" className="panel animate-rise p-6 text-center sm:p-10">
      {isPersonalBest && (
        <p className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full border border-neon-400/40 bg-neon-400/10 px-4 py-1.5 text-sm font-semibold text-neon-300">
          <span aria-hidden="true">✦</span> New personal best!
        </p>
      )}
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
        {durationLabel} · {scenarioName}
      </p>
      <p className="gradient-text mt-2 font-display text-7xl font-bold tabular-nums sm:text-8xl">
        {stats.netWpm}
      </p>
      <p className="mt-1 text-sm font-medium uppercase tracking-[0.2em] text-slate-400">
        words per minute
      </p>

      <p className="mx-auto mt-4 max-w-md text-lg text-white">
        <span className="font-display font-bold">{rank.title}</span>
        <span className="text-slate-400"> — {rank.detail}</span>
      </p>

      <dl className="mx-auto mt-8 grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Accuracy', value: `${stats.accuracy}%` },
          { label: 'Raw speed', value: `${stats.grossWpm} WPM` },
          { label: 'Characters', value: `${stats.correctChars}/${stats.totalTyped}` },
          { label: 'Time', value: `${stats.elapsedSeconds}s` },
        ].map((m) => (
          <div key={m.label} className="rounded-xl border border-white/10 bg-void-950/50 px-3 py-4">
            <dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              {m.label}
            </dt>
            <dd className="mt-1 font-mono text-xl font-bold tabular-nums text-white">
              {m.value}
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
        <button type="button" className="btn-neon" onClick={onRetry}>
          Try again
        </button>
        <button type="button" className="btn-ghost" onClick={handleCopy}>
          {copied ? 'Copied!' : 'Copy result'}
        </button>
      </div>
      <p className="mx-auto mt-4 max-w-md text-xs leading-relaxed text-slate-500">
        {shareText}
      </p>
      <p className="mt-2 text-xs text-slate-600">
        Scenario: {SCENARIOS.find((s) => s.name === scenarioName)?.blurb ?? scenarioName}
      </p>
    </section>
  )
}
