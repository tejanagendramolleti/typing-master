import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Badge, Card, EmptyState, ErrorState, LoadingState, Metric, PageHeader } from '../../components/ui'
import { get } from '../../lib/api'
import { useAuth } from '../../lib/useAuth'
import type { AttemptSummary, ExamProfile } from '../../lib/types'

/** A recent result, as the dashboard shows it. */
interface RecentResult {
  attemptId: number
  examCode: string
  examName: string
  netWpm: number
  accuracyPct: number
  passed: boolean
  submittedAt: string
}

/** The daily allowance, as the dashboard shows it. */
interface QuotaStatus {
  used: number
  limit: number
  remaining: number
  isPro: boolean
  resetsAt: string
}

/**
 * The dashboard: what the candidate has done, and what to do next.
 */
export default function DashboardPage() {
  const { user } = useAuth()

  const { data: recent, isLoading, isError, error } = useQuery({
    queryKey: ['attempts', 'recent'],
    queryFn: () => get<RecentResult[]>('/api/v1/attempts/recent'),
  })

  const { data: quota } = useQuery({
    queryKey: ['quota'],
    queryFn: () => get<QuotaStatus>('/api/v1/attempts/quota'),
  })

  const { data: resumable } = useQuery({
    queryKey: ['attempts', 'resumable'],
    queryFn: () => get<AttemptSummary[]>('/api/v1/attempts/resumable'),
  })

  const { data: exams } = useQuery({
    queryKey: ['exams'],
    queryFn: () => get<ExamProfile[]>('/api/v1/exams'),
  })

  const best = recent?.reduce((top, item) => (item.netWpm > top ? item.netWpm : top), 0) ?? 0
  const average =
    recent && recent.length > 0
      ? recent.reduce((sum, item) => sum + item.netWpm, 0) / recent.length
      : 0

  return (
    <div className="container-page py-12">
      <PageHeader
        eyebrow="Your dashboard"
        title={`Welcome back${user?.displayName ? `, ${user.displayName}` : ''}`}
        description="Pick up where you left off, or start something new."
        action={
          <Link to="/exams" className="btn-primary">
            Start a test
          </Link>
        }
      />

      {/* ---- The allowance ---- */}
      {quota && (
        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          <Card>
            <Metric
              label="Tests used today"
              value={`${quota.used} of ${quota.limit}`}
              tone={quota.remaining === 0 ? 'bad' : 'default'}
            />
          </Card>
          <Card>
            <Metric label="Left today" value={quota.remaining} />
          </Card>
          <Card>
            <Metric
              label="Your plan"
              value={quota.isPro ? 'Pro' : 'Free'}
              tone={quota.isPro ? 'good' : 'default'}
            />
          </Card>
        </div>
      )}

      {quota && quota.remaining === 0 && !quota.isPro && (
        <div className="mb-8">
          <Card className="border-accent-300 bg-accent-50 dark:border-accent-800 dark:bg-accent-950/30">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-title">You have used today's three tests</h2>
                <p className="text-body mt-1">
                  The allowance resets at midnight. Pro removes the limit and adds the full
                  mock series.
                </p>
              </div>
              <Link to="/pricing" className="btn-primary shrink-0">
                See the plans
              </Link>
            </div>
          </Card>
        </div>
      )}

      {/* ---- A test to resume ---- */}
      {resumable && resumable.length > 0 && (
        <div className="mb-8">
          <Card title="Unfinished tests" description="Pick up where you stopped.">
            <ul className="divide-y divide-ink-200 dark:divide-ink-800">
              {resumable.map((attempt) => (
                <li key={attempt.attemptId} className="flex items-center justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink-900 dark:text-ink-100">
                      {attempt.examName}
                    </p>
                    <p className="text-muted">
                      {attempt.typedText.length} characters typed so far
                    </p>
                  </div>
                  <Link
                    to={`/test/${attempt.attemptId}`}
                    className="btn-secondary btn-sm shrink-0"
                  >
                    Resume
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}

      {/* ---- The recent results ---- */}
      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <Card title="Your recent tests">
          {isLoading ? (
            <LoadingState label="Loading your results" />
          ) : isError ? (
            <ErrorState
              title="Your results did not load"
              message={error instanceof Error ? error.message : undefined}
            />
          ) : !recent || recent.length === 0 ? (
            <EmptyState
              title="No tests yet"
              description="Take your first test and it will show up here."
              action={
                <Link to="/exams" className="btn-primary">
                  Start a test
                </Link>
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-ink-200 dark:border-ink-800">
                    <th className="py-2 pr-3 font-medium text-ink-500 dark:text-ink-400">Exam</th>
                    <th className="py-2 pr-3 font-medium text-ink-500 dark:text-ink-400">Speed</th>
                    <th className="py-2 pr-3 font-medium text-ink-500 dark:text-ink-400">Accuracy</th>
                    <th className="py-2 pr-3 font-medium text-ink-500 dark:text-ink-400">Result</th>
                    <th className="py-2 font-medium text-ink-500 dark:text-ink-400">When</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100 dark:divide-ink-800">
                  {recent.map((item) => (
                    <tr key={item.attemptId}>
                      <td className="py-2.5 pr-3">
                        <Link
                          to={`/result/${item.attemptId}`}
                          className="font-medium text-ink-900 hover:text-accent-700 dark:text-ink-100 dark:hover:text-accent-400"
                        >
                          {item.examName}
                        </Link>
                      </td>
                      <td className="py-2.5 pr-3 font-mono tabular-nums">{item.netWpm}</td>
                      <td className="py-2.5 pr-3 font-mono tabular-nums">
                        {item.accuracyPct.toFixed(1)}%
                      </td>
                      <td className="py-2.5 pr-3">
                        <Badge tone={item.passed ? 'good' : 'warn'}>
                          {item.passed ? 'Pass' : 'Below'}
                        </Badge>
                      </td>
                      <td className="py-2.5 text-ink-500 dark:text-ink-400">
                        {new Date(item.submittedAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <div className="stack">
          <Card title="Your averages">
            <div className="space-y-4">
              <Metric label="Best speed" value={`${best} wpm`} tone={best > 0 ? 'good' : 'default'} />
              <Metric label="Average speed" value={`${average.toFixed(0)} wpm`} />
            </div>
            <div className="mt-5 border-t border-ink-200 pt-4 dark:border-ink-800">
              <Link to="/analytics" className="text-sm font-medium text-accent-700 hover:underline dark:text-accent-400">
                See your trends, weak keys and weak words →
              </Link>
            </div>
          </Card>

          {exams && exams.length > 0 && (
            <Card title="Jump straight in">
              <ul className="space-y-2">
                {exams.slice(0, 4).map((exam) => (
                  <li key={exam.code}>
                    <Link
                      to={`/exams/${exam.code}`}
                      className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-sm hover:bg-ink-100 dark:hover:bg-ink-800"
                    >
                      <span className="truncate text-ink-700 dark:text-ink-300">{exam.name}</span>
                      <span className="shrink-0 text-xs text-ink-400">{exam.language}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
