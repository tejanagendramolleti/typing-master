import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Badge, Card, EmptyState, ErrorState, LoadingState, PageHeader } from '../../components/ui'
import { get } from '../../lib/api'
import type { ExamProfile } from '../../lib/types'

/** The languages the catalogue can be filtered by. */
const LANGUAGES = [
  { code: 'ALL', label: 'All languages' },
  { code: 'EN', label: 'English' },
  { code: 'HI', label: 'Hindi' },
  { code: 'TE', label: 'Telugu' },
  { code: 'ALNUM', label: 'Alphanumeric' },
]

/** The layout names, shown under the exam. */
const LAYOUT_LABELS: Record<string, string> = {
  'en-qwerty': 'QWERTY',
  'hi-inscript': 'Hindi Inscript',
  'hi-krutidev': 'Kruti Dev 010',
  'te-inscript': 'Telugu Inscript',
}

/** Formats a duration in seconds as minutes. */
function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds} seconds`
  const minutes = Math.round(seconds / 60)
  return `${minutes} minute${minutes === 1 ? '' : 's'}`
}

/**
 * The exam catalogue.
 */
export default function ExamsPage() {
  const [language, setLanguage] = useState('ALL')
  const [query, setQuery] = useState('')

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['exams'],
    queryFn: () => get<ExamProfile[]>('/api/v1/exams'),
  })

  const filtered = useMemo(() => {
    const profiles = data ?? []
    const needle = query.trim().toLowerCase()
    return profiles.filter((profile) => {
      if (language !== 'ALL' && profile.language !== language) return false
      if (!needle) return true
      return (
        profile.name.toLowerCase().includes(needle) ||
        profile.code.toLowerCase().includes(needle) ||
        (profile.description ?? '').toLowerCase().includes(needle)
      )
    })
  }, [data, language, query])

  if (isLoading) return <LoadingState label="Loading the catalogue" />

  if (isError) {
    return (
      <div className="container-page py-12">
        <ErrorState
          title="The catalogue did not load"
          message={error instanceof Error ? error.message : 'Please try again in a moment.'}
        />
      </div>
    )
  }

  return (
    <div className="container-page py-12">
      <PageHeader
        eyebrow="The catalogue"
        title="Every exam we have a profile for"
        description="Each profile carries its own rules — the time allowed, the passing speed, the way mistakes are counted and whether the backspace key works. The rules are stored with the exam, not in the code, so they are the same for everyone."
      />

      {/* ---- The filters ---- */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by language">
          {LANGUAGES.map((option) => (
            <button
              key={option.code}
              type="button"
              onClick={() => setLanguage(option.code)}
              aria-pressed={language === option.code}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                language === option.code
                  ? 'bg-accent-600 text-white'
                  : 'bg-white text-ink-700 hover:bg-ink-100 dark:bg-ink-900 dark:text-ink-300 dark:hover:bg-ink-800'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
        <div className="w-full sm:w-72">
          <label htmlFor="exam-search" className="sr-only">
            Search the exams
          </label>
          <input
            id="exam-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name or code"
            className="input"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="Nothing matches"
          description="Try a different language, or clear the search."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((profile) => (
            <ExamCard key={profile.code} profile={profile} />
          ))}
        </div>
      )}
    </div>
  )
}

/** One exam in the catalogue. */
function ExamCard({ profile }: { profile: ExamProfile }) {
  return (
    <Link to={`/exams/${profile.code}`} className="group">
      <Card className="h-full transition-shadow group-hover:shadow-lg">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-title truncate group-hover:text-accent-700 dark:group-hover:text-accent-400">
              {profile.name}
            </h2>
            <p className="text-muted mt-1">{profile.description}</p>
          </div>
          <Badge tone="accent">{profile.language}</Badge>
        </div>

        <dl className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <dt className="metric-label">Time</dt>
            <dd className="mt-0.5 text-sm font-semibold text-ink-900 dark:text-ink-100">
              {formatDuration(profile.durationSeconds)}
            </dd>
          </div>
          <div>
            <dt className="metric-label">Passing</dt>
            <dd className="mt-0.5 text-sm font-semibold text-ink-900 dark:text-ink-100">
              {profile.passingNetWpm} wpm
            </dd>
          </div>
          <div>
            <dt className="metric-label">Accuracy</dt>
            <dd className="mt-0.5 text-sm font-semibold text-ink-900 dark:text-ink-100">
              {profile.minAccuracyPct}%
            </dd>
          </div>
          <div>
            <dt className="metric-label">Keyboard</dt>
            <dd className="mt-0.5 text-sm font-semibold text-ink-900 dark:text-ink-100">
              {LAYOUT_LABELS[profile.keyboardLayout] ?? profile.keyboardLayout}
            </dd>
          </div>
        </dl>

        {profile.sourceNote && (
          <p className="mt-4 border-t border-ink-200 pt-3 text-xs text-ink-500 dark:border-ink-800 dark:text-ink-400">
            {profile.sourceNote}
          </p>
        )}
      </Card>
    </Link>
  )
}
