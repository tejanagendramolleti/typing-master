import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Banner, Card, PageHeader } from '../../components/ui'
import { get } from '../../lib/api'
import { useAuth } from '../../lib/useAuth'
import type { ExamProfile } from '../../lib/types'

/** The languages a candidate can pick. */
const LANGUAGES = [
  { code: 'EN', label: 'English' },
  { code: 'HI', label: 'Hindi' },
  { code: 'TE', label: 'Telugu' },
  { code: 'ALNUM', label: 'Alphanumeric' },
]

/**
 * The profile page: the preferences that shape the dashboard.
 */
export default function ProfilePage() {
  const { user, updateProfile } = useAuth()

  const [displayName, setDisplayName] = useState(user?.displayName ?? '')
  const [preferredExamCode, setPreferredExamCode] = useState(user?.preferredExamCode ?? '')
  const [preferredLanguage, setPreferredLanguage] = useState(user?.preferredLanguage ?? 'EN')
  const [targetWpm, setTargetWpm] = useState(String(user?.targetWpm ?? 40))
  const [leaderboardOptOut, setLeaderboardOptOut] = useState(user?.leaderboardOptOut ?? false)
  const [showEmailOnLeaderboard, setShowEmailOnLeaderboard] = useState(
    user?.showEmailOnLeaderboard ?? false,
  )

  // The user arrives asynchronously, so the form is filled in once it does.
  useEffect(() => {
    if (!user) return
    setDisplayName(user.displayName ?? '')
    setPreferredExamCode(user.preferredExamCode ?? '')
    setPreferredLanguage(user.preferredLanguage ?? 'EN')
    setTargetWpm(String(user.targetWpm ?? 40))
    setLeaderboardOptOut(user.leaderboardOptOut)
    setShowEmailOnLeaderboard(user.showEmailOnLeaderboard)
  }, [user])

  const { data: exams } = useQuery({
    queryKey: ['exams'],
    queryFn: () => get<ExamProfile[]>('/api/v1/exams'),
  })

  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setSaved(false)
    setError(null)
    setPending(true)
    try {
      await updateProfile({
        displayName: displayName.trim() || undefined,
        preferredExamCode: preferredExamCode || null,
        preferredLanguage: preferredLanguage || null,
        targetWpm: Number(targetWpm) || undefined,
        leaderboardOptOut,
        showEmailOnLeaderboard,
      })
      setSaved(true)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The update failed.')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="container-page py-12">
      <PageHeader
        eyebrow="Your account"
        title="Profile"
        description="These preferences shape your dashboard and the drills you are given."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <Card title="Preferences">
          <form onSubmit={handleSubmit} className="stack" noValidate>
            {saved && <Banner tone="good">Your preferences have been saved.</Banner>}
            {error && (
              <Banner tone="bad" title="That did not work">
                {error}
              </Banner>
            )}

            <div>
              <label htmlFor="displayName" className="label">
                Display name
              </label>
              <input
                id="displayName"
                type="text"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                className="input"
                maxLength={80}
              />
            </div>

            <div>
              <label htmlFor="preferredExamCode" className="label">
                Preferred exam
              </label>
              <select
                id="preferredExamCode"
                value={preferredExamCode}
                onChange={(event) => setPreferredExamCode(event.target.value)}
                className="input"
              >
                <option value="">No preference</option>
                {exams?.map((exam) => (
                  <option key={exam.code} value={exam.code}>
                    {exam.name} ({exam.language})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="preferredLanguage" className="label">
                Preferred language
              </label>
              <select
                id="preferredLanguage"
                value={preferredLanguage}
                onChange={(event) => setPreferredLanguage(event.target.value)}
                className="input"
              >
                {LANGUAGES.map((language) => (
                  <option key={language.code} value={language.code}>
                    {language.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="targetWpm" className="label">
                Your target speed
              </label>
              <div className="flex items-center gap-3">
                <input
                  id="targetWpm"
                  type="range"
                  min={5}
                  max={200}
                  value={targetWpm}
                  onChange={(event) => setTargetWpm(event.target.value)}
                  className="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-ink-200 accent-accent-600 dark:bg-ink-700"
                />
                <span className="w-20 text-right font-mono text-sm font-semibold text-ink-900 dark:text-ink-100">
                  {targetWpm} wpm
                </span>
              </div>
            </div>

            <fieldset className="space-y-3 border-t border-ink-200 pt-5 dark:border-ink-800">
              <legend className="label">Privacy</legend>

              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={leaderboardOptOut}
                  onChange={(event) => setLeaderboardOptOut(event.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-ink-300 text-accent-600 focus:ring-accent-500 dark:border-ink-600"
                />
                <span>
                  <span className="block text-sm font-medium text-ink-900 dark:text-ink-100">
                    Keep me off the leaderboard
                  </span>
                  <span className="text-muted">
                    Your results are still recorded, they are just not shown next to anyone
                    else.
                  </span>
                </span>
              </label>

              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={showEmailOnLeaderboard}
                  onChange={(event) => setShowEmailOnLeaderboard(event.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-ink-300 text-accent-600 focus:ring-accent-500 dark:border-ink-600"
                />
                <span>
                  <span className="block text-sm font-medium text-ink-900 dark:text-ink-100">
                    Show my email on the leaderboard
                  </span>
                  <span className="text-muted">
                    Off by default. Turn it on only if you want people to be able to reach
                    you from there.
                  </span>
                </span>
              </label>
            </fieldset>

            <button type="submit" disabled={pending} className="btn-primary self-start">
              {pending ? 'Saving…' : 'Save the preferences'}
            </button>
          </form>
        </Card>

        <div className="stack">
          <Card title="Your account">
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-ink-500 dark:text-ink-400">Email</dt>
                <dd className="truncate font-medium text-ink-900 dark:text-ink-100">
                  {user?.email}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-ink-500 dark:text-ink-400">Role</dt>
                <dd className="font-medium text-ink-900 dark:text-ink-100">{user?.role}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-ink-500 dark:text-ink-400">Free tests a day</dt>
                <dd className="font-medium text-ink-900 dark:text-ink-100">
                  {user?.dailyFreeLimit}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-ink-500 dark:text-ink-400">Email verified</dt>
                <dd className="font-medium text-ink-900 dark:text-ink-100">
                  {user?.emailVerified ? 'Yes' : 'Not yet'}
                </dd>
              </div>
            </dl>
          </Card>
        </div>
      </div>
    </div>
  )
}
