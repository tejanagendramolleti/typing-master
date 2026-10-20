import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Badge, Card, EmptyState, ErrorState, LoadingState, Metric, PageHeader } from '../../components/ui'
import { get } from '../../lib/api'

/** The speed and accuracy over time. */
interface TrendPoint {
  date: string
  netWpm: number
  accuracyPct: number
  attemptId: number
}

/** A key the candidate is slow on. */
interface WeakKey {
  key: string
  errors: number
  total: number
  errorRate: number
}

/** A word the candidate misses. */
interface WeakWord {
  word: string
  errors: number
  times: number
}

/** The performance by hour of the day. */
interface HourPerformance {
  hour: number
  averageWpm: number
  attempts: number
}

/** Everything the analytics page shows. */
interface Analytics {
  trends: TrendPoint[]
  weakKeys: WeakKey[]
  weakWords: WeakWord[]
  byHour: HourPerformance[]
  totalAttempts: number
  averageNetWpm: number
  averageAccuracyPct: number
}

/**
 * The analytics page.
 *
 * The question this page answers is "what should I practise next", so the
 * weak keys and the weak words come first. The trends are context.
 */
export default function AnalyticsPage() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['analytics'],
    queryFn: () => get<Analytics>('/api/v1/analytics/overview'),
  })

  if (isLoading) return <LoadingState label="Loading your analytics" />

  if (isError) {
    return (
      <div className="container-page py-12">
        <ErrorState
          title="Your analytics did not load"
          message={error instanceof Error ? error.message : 'Please try again in a moment.'}
        />
      </div>
    )
  }

  if (!data || data.totalAttempts === 0) {
    return (
      <div className="container-page py-12">
        <PageHeader
          eyebrow="Analytics"
          title="Your trends"
          description="Once you have taken a few tests, this page shows where to spend your time."
        />
        <EmptyState
          title="Nothing to show yet"
          description="Take a few tests and the analytics will build itself up."
          action={
            <Link to="/exams" className="btn-primary">
              Take a test
            </Link>
          }
        />
      </div>
    )
  }

  return (
    <div className="container-page py-12">
      <PageHeader
        eyebrow="Analytics"
        title="Your trends"
        description="Where you are slow, what you mistype, and when you type best."
        action={
          <Link to="/drills" className="btn-primary">
            Practise your weak spots
          </Link>
        }
      />

      {/* ---- The headline numbers ---- */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <Metric label="Tests taken" value={data.totalAttempts} />
        </Card>
        <Card>
          <Metric label="Average speed" value={`${data.averageNetWpm.toFixed(0)} wpm`} />
        </Card>
        <Card>
          <Metric label="Average accuracy" value={`${data.averageAccuracyPct.toFixed(1)}%`} />
        </Card>
        <Card>
          <Metric label="Weak words" value={data.weakWords.length} />
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ---- The speed over time ---- */}
        <Card title="Speed over time" description="Your net speed, test by test.">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.trends}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.25)" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} width={40} />
                <Tooltip
                  contentStyle={{
                    background: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '0.5rem',
                    fontSize: '0.75rem',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="netWpm"
                  stroke="#4f46e5"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* ---- The accuracy over time ---- */}
        <Card title="Accuracy over time" description="A falling line means you are rushing.">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.trends}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.25)" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} width={40} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{
                    background: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '0.5rem',
                    fontSize: '0.75rem',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="accuracyPct"
                  stroke="#059669"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* ---- The weak keys ---- */}
        <Card
          title="The keys you are slow on"
          description="The physical keys that cost you the most mistakes."
        >
          {data.weakKeys.length === 0 ? (
            <p className="text-body">No key stands out yet.</p>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.weakKeys.slice(0, 12)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.25)" vertical={false} />
                  <XAxis dataKey="key" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} width={40} allowDecimals={false} />
                  <Tooltip
                    cursor={{ fill: 'rgba(99,102,241,0.08)' }}
                    contentStyle={{
                      background: 'white',
                      border: '1px solid #e2e8f0',
                      borderRadius: '0.5rem',
                      fontSize: '0.75rem',
                    }}
                  />
                  <Bar dataKey="errors" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        {/* ---- The hour of the day ---- */}
        <Card
          title="When you type best"
          description="Your average speed by the hour of the day, in your own time zone."
        >
          {data.byHour.length === 0 ? (
            <p className="text-body">Not enough tests to say yet.</p>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.byHour}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.25)" vertical={false} />
                  <XAxis dataKey="hour" tick={{ fontSize: 11 }} tickFormatter={(h) => `${h}:00`} />
                  <YAxis tick={{ fontSize: 11 }} width={40} />
                  <Tooltip
                    cursor={{ fill: 'rgba(99,102,241,0.08)' }}
                    contentStyle={{
                      background: 'white',
                      border: '1px solid #e2e8f0',
                      borderRadius: '0.5rem',
                      fontSize: '0.75rem',
                    }}
                  />
                  <Bar dataKey="averageWpm" fill="#059669" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>

      {/* ---- The weak words ---- */}
      <div className="mt-6">
        <Card
          title="The words you miss most"
          description="These are the words to drill. Each one is worth a drill on its own."
        >
          {data.weakWords.length === 0 ? (
            <p className="text-body">You have not missed a word often enough to name it yet.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {data.weakWords.slice(0, 30).map((item) => (
                <span
                  key={item.word}
                  className="inline-flex items-center gap-2 rounded-lg border border-ink-200 px-3 py-1.5 text-sm dark:border-ink-700"
                >
                  <span className="font-medium text-ink-800 dark:text-ink-100">{item.word}</span>
                  <Badge tone={item.errors > 2 ? 'bad' : 'warn'}>
                    {item.errors} of {item.times}
                  </Badge>
                </span>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
