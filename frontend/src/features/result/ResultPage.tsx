import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Badge, Banner, Card, ErrorState, LoadingState, Metric } from '../../components/ui'
import { get } from '../../lib/api'
import type { AttemptResult, ErrorType } from '../../lib/types'

/** The colours used for the error breakdown chart. */
const ERROR_COLOURS: Record<string, string> = {
  WRONG: '#dc2626',
  MISSING: '#d97706',
  EXTRA: '#f87171',
  CASE: '#6366f1',
  PUNCTUATION: '#818cf8',
  SPACING: '#a5b4fc',
}

/** The label shown for each error type. */
const ERROR_LABELS: Record<ErrorType, string> = {
  WRONG: 'Wrong words',
  MISSING: 'Missed words',
  EXTRA: 'Extra words',
  CASE: 'Wrong case',
  PUNCTUATION: 'Wrong punctuation',
  SPACING: 'Wrong spacing',
}

/** The label shown for each anti-cheat signal. */
const CHEAT_FLAG_LABELS: Record<string, string> = {
  PASTE_ATTEMPT: 'a paste',
  DROP_ATTEMPT: 'a drop',
  COPY_ATTEMPT: 'a copy',
  CONTEXT_MENU: 'the context menu',
  BLUR: 'leaving the tab',
  IMPOSSIBLE_TELEMETRY: 'a result that could not have been typed',
}

/**
 * Turns a flag into a phrase.
 *
 * The flags come with their counts attached — `PASTE_ATTEMPT:2` — so the
 * count is dropped before the name is looked up.
 */
function describeFlag(flag: string): string {
  const name = flag.split(':')[0]
  return CHEAT_FLAG_LABELS[name] ?? name.replace(/_/g, ' ').toLowerCase()
}

/**
 * The result page.
 *
 * The score comes first, because that is what the candidate came for. The
 * word-by-word diff comes next, because that is where the learning is.
 */
export default function ResultPage() {
  const { attemptId } = useParams<{ attemptId: string }>()
  const id = Number(attemptId)

  const { data: result, isLoading, isError, error } = useQuery({
    queryKey: ['result', id],
    queryFn: () => get<AttemptResult>(`/api/v1/attempts/${id}/result`),
    enabled: Number.isFinite(id),
  })

  const breakdown = useMemo(() => {
    if (!result) return []
    return Object.entries(result.errorBreakdown)
      .filter(([, count]) => count > 0)
      .map(([type, count]) => ({
        name: ERROR_LABELS[type as ErrorType] ?? type,
        type,
        count,
      }))
  }, [result])

  if (isLoading) return <LoadingState label="Loading the result" />

  if (isError || !result) {
    return (
      <div className="container-page py-12">
        <ErrorState
          title="That result could not be loaded"
          message={error instanceof Error ? error.message : 'Please try again in a moment.'}
          action={
            <Link to="/dashboard" className="btn-secondary">
              Back to the dashboard
            </Link>
          }
        />
      </div>
    )
  }

  const minutes = Math.floor(result.durationMs / 60_000)
  const seconds = Math.round((result.durationMs % 60_000) / 1000)

  // The telemetry check is the one flag that changes the result rather than
  // just recording something, so it gets its own sentence.
  const impossibleTelemetry = result.cheatFlags.some(
    (flag) => flag.split(':')[0] === 'IMPOSSIBLE_TELEMETRY',
  )
  const describedFlags = result.cheatFlags.map(describeFlag)

  return (
    <div className="container-page py-12">
      {/* ---- The verdict ---- */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="eyebrow mb-2">{result.examName}</p>
          <h1 className="text-display">
            {result.passed ? 'You passed' : 'Not this time'}
          </h1>
          <p className="text-muted mt-2">
            {result.passed
              ? `You cleared the ${result.passingNetWpm} wpm bar and the ${result.minAccuracyPct}% accuracy floor.`
              : `To pass you needed ${result.passingNetWpm} wpm and ${result.minAccuracyPct}% accuracy. You reached ${result.netWpm} wpm and ${result.accuracyPct.toFixed(1)}% accuracy.`}
          </p>
        </div>
        <Badge tone={result.passed ? 'good' : 'warn'}>
          {result.passed ? 'Pass' : 'Below the bar'}
        </Badge>
      </div>

      {/* ---- The numbers ---- */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <Card>
          <Metric label="Net speed" value={result.netWpm} hint="words a minute" />
        </Card>
        <Card>
          <Metric label="Gross speed" value={result.grossWpm} hint="before the penalty" />
        </Card>
        <Card>
          <Metric
            label="Accuracy"
            value={`${result.accuracyPct.toFixed(1)}%`}
            tone={result.accuracyPct >= 90 ? 'good' : result.accuracyPct >= 75 ? 'warn' : 'bad'}
          />
        </Card>
        <Card>
          <Metric label="Full mistakes" value={result.fullMistakes} />
        </Card>
        <Card>
          <Metric label="Half mistakes" value={result.halfMistakes} />
        </Card>
        <Card>
          <Metric label="Time" value={`${minutes}m ${seconds}s`} />
        </Card>
      </div>

      {/* ---- The cheer ---- */}
      {result.passed && result.certificateId && (
        <div className="mb-6">
          <Banner
            tone="good"
            title="You earned a certificate"
            action={
              <Link to="/certificates/verify" className="btn-secondary btn-sm">
                See the certificates
              </Link>
            }
          >
            A full-length mock at or above the target speed earns one, with a number
            anyone can check.
          </Banner>
        </div>
      )}

      {result.cheatFlags.length > 0 && (
        <div className="mb-6">
          <Banner tone="warn" title="This test was flagged">
            {impossibleTelemetry ? (
              <>
                The timing of this test could not have been produced by typing, so the
                result was not counted as a pass.
              </>
            ) : (
              <>
                The attempt to {describedFlags.join(', ')} was recorded. It does not change
                your score, but it is on the record.
              </>
            )}
          </Banner>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        {/* ---- The diff ---- */}
        <Card
          title="Word by word"
          description="The passage as you typed it. The colours match the error types below."
        >
          <WordDiff result={result} />
        </Card>

        <div className="stack">
          {/* ---- The breakdown ---- */}
          <Card title="Where the mistakes were">
            {breakdown.length === 0 ? (
              <p className="text-body">No mistakes at all. That is a clean run.</p>
            ) : (
              <>
                <div className="h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={breakdown} layout="vertical" margin={{ left: 0, right: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.25)" horizontal={false} />
                      <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={110}
                        tick={{ fontSize: 11 }}
                      />
                      <Tooltip
                        cursor={{ fill: 'rgba(99,102,241,0.08)' }}
                        contentStyle={{
                          background: 'white',
                          border: '1px solid #e2e8f0',
                          borderRadius: '0.5rem',
                          fontSize: '0.75rem',
                        }}
                      />
                      <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                        {breakdown.map((entry) => (
                          <Cell key={entry.type} fill={ERROR_COLOURS[entry.type] ?? '#6366f1'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <dl className="mt-4 space-y-2 border-t border-ink-200 pt-4 text-sm dark:border-ink-800">
                  {breakdown.map((entry) => (
                    <div key={entry.type} className="flex items-center justify-between gap-4">
                      <dt className="flex items-center gap-2 text-ink-600 dark:text-ink-400">
                        <span
                          aria-hidden="true"
                          className="h-2.5 w-2.5 rounded-sm"
                          style={{ backgroundColor: ERROR_COLOURS[entry.type] ?? '#6366f1' }}
                        />
                        {entry.name}
                      </dt>
                      <dd className="font-mono font-semibold tabular-nums text-ink-900 dark:text-ink-100">
                        {entry.count}
                      </dd>
                    </div>
                  ))}
                </dl>
              </>
            )}
          </Card>

          {/* ---- The keystrokes ---- */}
          <Card title="The keystrokes">
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-ink-500 dark:text-ink-400">Keys pressed</dt>
                <dd className="font-mono font-semibold tabular-nums text-ink-900 dark:text-ink-100">
                  {result.keystrokes}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-ink-500 dark:text-ink-400">Backspaces</dt>
                <dd className="font-mono font-semibold tabular-nums text-ink-900 dark:text-ink-100">
                  {result.backspaces}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-ink-500 dark:text-ink-400">Characters typed</dt>
                <dd className="font-mono font-semibold tabular-nums text-ink-900 dark:text-ink-100">
                  {result.typedChars}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-ink-500 dark:text-ink-400">Words typed</dt>
                <dd className="font-mono font-semibold tabular-nums text-ink-900 dark:text-ink-100">
                  {result.typedWords}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-ink-500 dark:text-ink-400">Words correct</dt>
                <dd className="font-mono font-semibold tabular-nums text-ink-900 dark:text-ink-100">
                  {result.correctWords}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-ink-500 dark:text-ink-400">Left the tab</dt>
                <dd className="font-mono font-semibold tabular-nums text-ink-900 dark:text-ink-100">
                  {result.blurCount}
                </dd>
              </div>
            </dl>
          </Card>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link to="/exams" className="btn-primary">
          Take another test
        </Link>
        <Link to="/analytics" className="btn-secondary">
          See your trends
        </Link>
      </div>
    </div>
  )
}

/**
 * The word-by-word diff.
 */
function WordDiff({ result }: { result: AttemptResult }) {
  const referenceWords = result.referenceText.split(' ')

  return (
    <div className="space-y-1">
      {referenceWords.map((word, index) => {
        const diff = result.wordDiffs.find((d) => d.index === index)
        const state = diff ? diff.type : 'CORRECT'
        const colour =
          state === 'WRONG'
            ? 'text-state-bad bg-state-bad/10'
            : state === 'MISSING'
              ? 'text-state-warn bg-state-warn/10'
              : state === 'EXTRA'
                ? 'text-ink-500 bg-ink-100'
                : state === 'CASE'
                  ? 'text-accent-700 bg-accent-50 dark:text-accent-300 dark:bg-accent-950/50'
                  : state === 'PUNCTUATION'
                    ? 'text-accent-600 bg-accent-50 dark:text-accent-400 dark:bg-accent-950/50'
                    : state === 'SPACING'
                      ? 'text-accent-800 bg-accent-100 dark:text-accent-200 dark:bg-accent-900/50'
                      : ''

        return (
          <span
            key={index}
            className={`inline-block rounded px-1 py-0.5 ${colour || 'text-ink-700 dark:text-ink-300'}`}
            title={diff ? `${ERROR_LABELS[diff.type] ?? diff.type}: ${diff.expected ?? '—'} / ${diff.actual ?? '—'}` : undefined}
          >
            {diff?.actual ?? word}
          </span>
        )
      })}
    </div>
  )
}
