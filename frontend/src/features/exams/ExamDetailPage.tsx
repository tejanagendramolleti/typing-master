import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Badge, Banner, Card, ErrorState, LoadingState, Metric, PageHeader } from '../../components/ui'
import { get, post } from '../../lib/api'
import { useAuth } from '../../lib/useAuth'
import type { AttemptSummary, ExamProfile } from '../../lib/types'

/** The layout names, shown under the exam. */
const LAYOUT_LABELS: Record<string, string> = {
  'en-qwerty': 'English QWERTY',
  'hi-inscript': 'Hindi Inscript',
  'hi-krutidev': 'Hindi Kruti Dev 010',
  'te-inscript': 'Telugu Inscript',
}

/** The difficulty levels the candidate can choose. */
const DIFFICULTIES = [
  { code: '', label: 'Any' },
  { code: 'EASY', label: 'Easy' },
  { code: 'MEDIUM', label: 'Medium' },
  { code: 'HARD', label: 'Hard' },
]

/** Formats a duration in seconds as minutes and seconds. */
function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const rest = seconds % 60
  if (minutes === 0) return `${rest} seconds`
  return `${minutes}m ${rest.toString().padStart(2, '0')}s`
}

/**
 * The detail page for one exam.
 */
export default function ExamDetailPage() {
  const { code } = useParams<{ code: string }>()
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const [difficulty, setDifficulty] = useState('')

  const { data: profile, isLoading, isError, error } = useQuery({
    queryKey: ['exam', code],
    queryFn: () => get<ExamProfile>(`/api/v1/exams/${code}`),
    enabled: Boolean(code),
  })

  const start = useMutation({
    mutationFn: () =>
      post<AttemptSummary>('/api/v1/attempts', {
        examCode: code,
        difficulty: difficulty || null,
      }),
    onSuccess: (attempt) => navigate(`/test/${attempt.attemptId}`),
  })

  if (isLoading) return <LoadingState label="Loading the exam" />

  if (isError || !profile) {
    return (
      <div className="container-page py-12">
        <ErrorState
          title="That exam could not be found"
          message={error instanceof Error ? error.message : 'It may have been withdrawn.'}
          action={
            <Link to="/exams" className="btn-secondary">
              Back to the catalogue
            </Link>
          }
        />
      </div>
    )
  }

  return (
    <div className="container-page py-12">
      <PageHeader
        eyebrow={profile.language}
        title={profile.name}
        description={profile.description ?? undefined}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="stack">
          <Card title="The rules" description="These come from the exam profile, not from the code.">
            <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
              <Metric label="Time allowed" value={formatDuration(profile.durationSeconds)} />
              <Metric label="Passing speed" value={`${profile.passingNetWpm} wpm`} />
              <Metric label="Minimum accuracy" value={`${profile.minAccuracyPct}%`} />
              <Metric label="Word length" value={`${profile.wordLengthChars} chars`} />
            </div>

            <dl className="mt-6 space-y-3 border-t border-ink-200 pt-5 dark:border-ink-800">
              <div className="flex items-start justify-between gap-4">
                <dt className="text-sm text-ink-600 dark:text-ink-400">Keyboard</dt>
                <dd className="text-sm font-medium text-ink-900 dark:text-ink-100">
                  {LAYOUT_LABELS[profile.keyboardLayout] ?? profile.keyboardLayout}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-4">
                <dt className="text-sm text-ink-600 dark:text-ink-400">Mistakes are counted as</dt>
                <dd className="text-sm font-medium text-ink-900 dark:text-ink-100">
                  {ERROR_MODEL_LABELS[profile.errorModel] ?? profile.errorModel}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-4">
                <dt className="text-sm text-ink-600 dark:text-ink-400">The backspace key</dt>
                <dd className="text-sm font-medium text-ink-900 dark:text-ink-100">
                  {profile.backspaceAllowed ? 'Works' : 'Does not work'}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-4">
                <dt className="text-sm text-ink-600 dark:text-ink-400">Live speed</dt>
                <dd className="text-sm font-medium text-ink-900 dark:text-ink-100">
                  {profile.showLiveWpm ? 'Shown while you type' : 'Shown only at the end'}
                </dd>
              </div>
            </dl>
          </Card>

          {profile.sourceNote && (
            <Banner tone="warn" title="Check the official notification">
              {profile.sourceNote}
            </Banner>
          )}
        </div>

        <div className="stack">
          <Card title="Start a test">
            <fieldset>
              <legend className="label">Difficulty</legend>
              <div className="flex flex-wrap gap-2">
                {DIFFICULTIES.map((option) => (
                  <button
                    key={option.code}
                    type="button"
                    onClick={() => setDifficulty(option.code)}
                    aria-pressed={difficulty === option.code}
                    className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                      difficulty === option.code
                        ? 'bg-accent-600 text-white'
                        : 'bg-ink-100 text-ink-700 hover:bg-ink-200 dark:bg-ink-800 dark:text-ink-300 dark:hover:bg-ink-700'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </fieldset>

            {isAuthenticated ? (
              <button
                type="button"
                onClick={() => start.mutate()}
                disabled={start.isPending}
                className="btn-primary mt-6 w-full"
              >
                {start.isPending ? 'Starting…' : 'Start the test'}
              </button>
            ) : (
              <>
                <Link to="/sign-in" state={{ from: `/exams/${code}` }} className="btn-primary mt-6 w-full">
                  Sign in to start
                </Link>
                <p className="text-muted mt-3 text-center">
                  New here?{' '}
                  <Link to="/sign-up" className="font-medium text-accent-700 hover:underline dark:text-accent-400">
                    Create a free account
                  </Link>
                </p>
              </>
            )}

            {start.isError && (
              <p className="mt-4 text-sm text-state-bad" role="alert">
                {start.error instanceof Error
                  ? start.error.message
                  : 'The test could not be started. Please try again.'}
              </p>
            )}
          </Card>

          <Card title="Before you start">
            <ul className="space-y-2.5 text-sm text-ink-600 dark:text-ink-400">
              <li className="flex gap-2">
                <span aria-hidden="true" className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-accent-500" />
                Pasting and dropping are blocked, and the attempt is marked if you try.
              </li>
              <li className="flex gap-2">
                <span aria-hidden="true" className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-accent-500" />
                Leaving the tab is recorded.
              </li>
              <li className="flex gap-2">
                <span aria-hidden="true" className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-accent-500" />
                The test submits itself when the time runs out.
              </li>
              <li className="flex gap-2">
                <span aria-hidden="true" className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-accent-500" />
                Your speed is recalculated on the server from what you typed.
              </li>
            </ul>
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge tone="neutral">{profile.alphanumeric ? 'Alphanumeric' : 'Prose'}</Badge>
              {profile.targetWords && (
                <Badge tone="neutral">Target {profile.targetWords} words</Badge>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

/** How each error model is described to a reader. */
const ERROR_MODEL_LABELS: Record<string, string> = {
  FULL_AND_HALF_MISTAKES: 'Full and half mistakes',
  PER_ERROR_PENALTY: 'A penalty per mistake',
  ACCURACY_ONLY: 'Accuracy only',
}
