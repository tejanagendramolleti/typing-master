import { useCallback, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AdSlot } from '../components/AdSlot'
import { ResultsPanel } from '../components/ResultsPanel'
import { TypingTest, type FinishedTest } from '../components/TypingTest'
import { SCENARIOS, type ScenarioId } from '../data/passages'
import { loadBest, loadHistory, saveResult } from '../lib/typing'

const VALID_DURATIONS = new Set([30, 60, 120, 180, 300])

function durationLabel(seconds: number): string {
  return seconds < 60 ? `${seconds} seconds` : `${seconds / 60} minute${seconds > 60 ? 's' : ''}`
}

/**
 * Home: hero + test + FAQ. The h1 and copy target
 * "typing test / wpm test / 1-3 minute typing test" search intent.
 */
export function HomePage() {
  const [params] = useSearchParams()
  const requested = Number(params.get('duration'))
  const initialDuration = VALID_DURATIONS.has(requested) ? requested : 60

  const [finished, setFinished] = useState<FinishedTest | null>(null)
  const [isBest, setIsBest] = useState(false)
  const [runId, setRunId] = useState(0)
  const [best, setBest] = useState(loadBest)
  const [history] = useState(loadHistory)

  const handleFinish = useCallback(
    (result: FinishedTest) => {
      const scenarioName = SCENARIOS.find((s) => s.id === result.scenario)?.name ?? result.scenario
      const saved = saveResult({
        ...result.stats,
        scenario: scenarioName,
        durationSeconds: result.durationSeconds,
      })
      setIsBest(saved.isPersonalBest)
      setBest((prev) => Math.max(prev, saved.entry.netWpm))
      setFinished(result)
      window.setTimeout(() => {
        document.getElementById('result')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 50)
    },
    [],
  )

  const handleRetry = useCallback(() => {
    setFinished(null)
    setRunId((id) => id + 1)
    window.setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }, 50)
  }, [])

  const scenarioName = (id: ScenarioId) => SCENARIOS.find((s) => s.id === id)?.name ?? id

  return (
    <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
      {/* ---- Hero ---- */}
      <section className="pb-10 pt-14 text-center sm:pt-20">
        <p className="chip mx-auto">
          <span aria-hidden="true" className="h-1.5 w-1.5 animate-pulse rounded-full bg-neon-400" />
          Free · No sign-up · Your best: {best > 0 ? `${best} WPM` : 'not set yet'}
        </p>
        <h1 className="mx-auto mt-5 max-w-3xl font-display text-4xl font-bold leading-[1.05] tracking-tight text-white sm:text-6xl">
          The <span className="gradient-text text-glow">typing test</span> that feels like
          the future
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-slate-400 sm:text-lg">
          Free online typing speed test with 1 minute, 2 minute and 3 minute modes.
          Instant WPM and accuracy, five scenarios from everyday prose to code — and
          your scores never leave your device.
        </p>
      </section>

      {/* ---- The test ---- */}
      <div id="test">
        <TypingTest
          key={runId}
          initialDuration={initialDuration}
          onFinish={handleFinish}
        />
      </div>

      <AdSlot slot="below-test" label="Below test ad (v2)" />

      {/* ---- Result ---- */}
      {finished && (
        <div id="result" className="mt-6 scroll-mt-24">
          <ResultsPanel
            stats={finished.stats}
            scenarioName={scenarioName(finished.scenario)}
            durationLabel={durationLabel(finished.durationSeconds)}
            isPersonalBest={isBest}
            onRetry={handleRetry}
          />
        </div>
      )}

      {/* ---- Recent history (this device) ---- */}
      {history.length > 0 && (
        <section aria-label="Your recent tests" className="panel mt-6 p-5 sm:p-6">
          <h2 className="font-display text-lg font-bold text-white">Recent runs on this device</h2>
          <ol className="mt-4 space-y-2">
            {history.slice(0, 5).map((h) => (
              <li
                key={h.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-void-950/50 px-4 py-2.5 text-sm"
              >
                <span className="text-slate-300">
                  {h.scenario} · {durationLabel(h.durationSeconds)}
                </span>
                <span className="font-mono tabular-nums text-white">
                  {h.netWpm} <span className="text-slate-500">WPM</span> · {h.accuracy}%
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* ---- FAQ (also in JSON-LD for search) ---- */}
      <section aria-label="Frequently asked questions" className="mx-auto mt-16 max-w-3xl">
        <h2 className="text-center font-display text-2xl font-bold text-white sm:text-3xl">
          Typing test questions, answered
        </h2>
        <div className="mt-8 space-y-3">
          {[
            {
              q: 'How is typing speed (WPM) calculated?',
              a: 'Words per minute is (all typed characters ÷ 5) ÷ minutes. Net WPM — the number we show big — counts only correct characters, so wild guessing never helps.',
            },
            {
              q: 'What is a good typing speed?',
              a: 'Around 40 WPM is average. Above 60 is good, above 80 is fast. Accuracy above 95% matters more than raw speed — fix errors first, then push pace.',
            },
            {
              q: 'Which test length should I choose?',
              a: '1 minute for quick checks and warm-ups, 2 minutes for a reliable measure, 3 minutes for stamina and exam-style practice. Longer tests give steadier, more honest scores.',
            },
            {
              q: 'Do I need an account?',
              a: 'No. The test runs entirely in your browser. Your best score and recent runs are stored on your own device — nothing is uploaded anywhere.',
            },
          ].map((item) => (
            <details
              key={item.q}
              className="group rounded-xl border border-white/10 bg-white/[0.03] px-5 py-4"
            >
              <summary className="cursor-pointer font-medium text-white marker:text-neon-400">
                {item.q}
              </summary>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{item.a}</p>
            </details>
          ))}
        </div>
        <p className="mt-8 text-center text-sm text-slate-500">
          Want technique, not just tests? Read the{' '}
          <Link to="/guide" className="text-neon-300 underline-offset-4 hover:underline">
            guide to typing faster
          </Link>
          .
        </p>
      </section>
    </div>
  )
}
