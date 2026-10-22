import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Badge, Banner, Card, EmptyState, LoadingState, PageHeader } from '../../components/ui'
import { get, patch, post } from '../../lib/api'
import type { ExamProfile, Page } from '../../lib/types'

/** One passage in the admin list. */
interface AdminPassage {
  id: number
  title: string | null
  language: string
  examType: string
  difficulty: string
  wordCount: number
  charCount: number
  active: boolean
}

/** The summary of the platform's activity. */
interface AdminStats {
  totalUsers: number
  totalAttempts: number
  totalPassages: number
  activeSubscriptions: number
  attemptsLast7Days: number
}

/**
 * The admin panel.
 *
 * A deliberately small panel: the passages, the exam profiles, the summary
 * figures and the import. The bulk of the work is in the import, which
 * takes a CSV or a JSON file and shows what it would do before it does it.
 */
export default function AdminPage() {
  const [tab, setTab] = useState<'passages' | 'exams' | 'stats'>('passages')
  const [importText, setImportText] = useState('')
  const [importFormat, setImportFormat] = useState<'json' | 'csv'>('json')

  const { data: passages, isLoading: loadingPassages } = useQuery({
    queryKey: ['admin', 'passages'],
    // The passage bank is a page of results, not a plain list.
    queryFn: () => get<Page<AdminPassage>>('/api/v1/admin/passages?size=50'),
  })

  const { data: exams } = useQuery({
    queryKey: ['exams'],
    queryFn: () => get<ExamProfile[]>('/api/v1/exams'),
  })

  const { data: stats } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: () => get<AdminStats>('/api/v1/admin/stats'),
  })

  const queryClient = useQueryClient()

  const [dryRun, setDryRun] = useState<{
    valid: number
    invalid: number
    errors: string[]
  } | null>(null)
  const [importMessage, setImportMessage] = useState<string | null>(null)

  const preview = useMutation({
    mutationFn: () =>
      post<{ valid: number; invalid: number; errors: string[] }>('/api/v1/admin/passages/import/preview', {
        format: importFormat,
        content: importText,
      }),
    onSuccess: (result) => {
      setDryRun(result)
      setImportMessage(null)
    },
  })

  const runImport = useMutation({
    mutationFn: () =>
      post<{ imported: number; skipped: number }>('/api/v1/admin/passages/import', {
        format: importFormat,
        content: importText,
      }),
    onSuccess: (result) => {
      setImportMessage(
        `${result.imported} passage${result.imported === 1 ? '' : 's'} imported, ${result.skipped} skipped.`,
      )
      setDryRun(null)
      void queryClient.invalidateQueries({ queryKey: ['admin', 'passages'] })
    },
  })

  const togglePassage = useMutation({
    mutationFn: (id: number) => patch(`/api/v1/admin/passages/${id}/toggle`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'passages'] })
    },
  })

  return (
    <div className="container-page py-12">
      <PageHeader
        eyebrow="Administration"
        title="The admin panel"
        description="Manage the passage bank, look at the exam profiles, and import passages in bulk."
      />

      <div className="mb-6 flex flex-wrap gap-2" role="tablist" aria-label="Admin sections">
        {(
          [
            ['passages', 'Passages'],
            ['exams', 'Exam profiles'],
            ['stats', 'Summary'],
          ] as const
        ).map(([code, label]) => (
          <button
            key={code}
            type="button"
            role="tab"
            aria-selected={tab === code}
            onClick={() => setTab(code)}
            className={`rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${
              tab === code
                ? 'bg-accent-600 text-white'
                : 'bg-white text-ink-700 hover:bg-ink-100 dark:bg-ink-900 dark:text-ink-300 dark:hover:bg-ink-800'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'passages' && (
        <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
          <Card title="The passage bank">
            {loadingPassages ? (
              <LoadingState label="Loading the passages" />
            ) : !passages || passages.content.length === 0 ? (
              <EmptyState title="No passages yet" />
            ) : (
              <div className="max-h-[32rem] overflow-y-auto">
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 bg-white dark:bg-ink-900">
                    <tr className="border-b border-ink-200 dark:border-ink-800">
                      <th className="py-2 pr-3 font-medium text-ink-500 dark:text-ink-400">Title</th>
                      <th className="py-2 pr-3 font-medium text-ink-500 dark:text-ink-400">Language</th>
                      <th className="py-2 pr-3 font-medium text-ink-500 dark:text-ink-400">Level</th>
                      <th className="py-2 pr-3 font-medium text-ink-500 dark:text-ink-400">Words</th>
                      <th className="py-2 font-medium text-ink-500 dark:text-ink-400">State</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-100 dark:divide-ink-800">
                    {passages.content.map((passage) => (
                      <tr key={passage.id}>
                        <td className="py-2.5 pr-3 font-medium text-ink-900 dark:text-ink-100">
                          {passage.title}
                        </td>
                        <td className="py-2.5 pr-3">{passage.language}</td>
                        <td className="py-2.5 pr-3">{passage.difficulty}</td>
                        <td className="py-2.5 pr-3 tabular-nums">{passage.wordCount}</td>
                        <td className="py-2.5">
                          <button
                            type="button"
                            onClick={() => togglePassage.mutate(passage.id)}
                            className="text-left"
                          >
                            <Badge tone={passage.active ? 'good' : 'neutral'}>
                              {passage.active ? 'Active' : 'Inactive'}
                            </Badge>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card
            title="Import passages"
            description="Paste a CSV or a JSON array. Check the preview before you import."
          >
            <div className="stack">
              <fieldset>
                <legend className="label">Format</legend>
                <div className="flex gap-2">
                  {(['json', 'csv'] as const).map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setImportFormat(option)}
                      aria-pressed={importFormat === option}
                      className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                        importFormat === option
                          ? 'bg-accent-600 text-white'
                          : 'bg-ink-100 text-ink-700 dark:bg-ink-800 dark:text-ink-300'
                      }`}
                    >
                      {option.toUpperCase()}
                    </button>
                  ))}
                </div>
              </fieldset>

              <div>
                <label htmlFor="import-content" className="label">
                  The file
                </label>
                <textarea
                  id="import-content"
                  value={importText}
                  onChange={(event) => setImportText(event.target.value)}
                  rows={8}
                  spellCheck={false}
                  placeholder={
                    importFormat === 'json'
                      ? '[{"title": "...", "content": "...", "language": "EN", "difficulty": "EASY"}]'
                      : 'title,content,language,difficulty\n"My title","The passage text...",EN,EASY'
                  }
                  className="input font-mono text-xs"
                />
              </div>

              {dryRun && (
                <Banner
                  tone={dryRun.invalid > 0 ? 'warn' : 'good'}
                  title={`${dryRun.valid} would be imported, ${dryRun.invalid} would be rejected`}
                >
                  {dryRun.errors.length > 0 && (
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-xs">
                      {dryRun.errors.slice(0, 8).map((message) => (
                        <li key={message}>{message}</li>
                      ))}
                    </ul>
                  )}
                </Banner>
              )}

              {importMessage && <Banner tone="good">{importMessage}</Banner>}

              {(preview.isError || runImport.isError) && (
                <Banner tone="bad" title="That did not work">
                  {String((preview.error ?? runImport.error)?.message ?? '')}
                </Banner>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => preview.mutate()}
                  disabled={!importText.trim() || preview.isPending}
                  className="btn-secondary flex-1"
                >
                  {preview.isPending ? 'Checking…' : 'Preview'}
                </button>
                <button
                  type="button"
                  onClick={() => runImport.mutate()}
                  disabled={!importText.trim() || runImport.isPending}
                  className="btn-primary flex-1"
                >
                  {runImport.isPending ? 'Importing…' : 'Import'}
                </button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {tab === 'exams' && (
        <Card title="The exam profiles" description="The rules for each exam. These are data, not code.">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-ink-200 dark:border-ink-800">
                  <th className="py-2 pr-3 font-medium text-ink-500 dark:text-ink-400">Code</th>
                  <th className="py-2 pr-3 font-medium text-ink-500 dark:text-ink-400">Name</th>
                  <th className="py-2 pr-3 font-medium text-ink-500 dark:text-ink-400">Language</th>
                  <th className="py-2 pr-3 font-medium text-ink-500 dark:text-ink-400">Time</th>
                  <th className="py-2 pr-3 font-medium text-ink-500 dark:text-ink-400">Passing</th>
                  <th className="py-2 font-medium text-ink-500 dark:text-ink-400">Model</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100 dark:divide-ink-800">
                {exams?.map((exam) => (
                  <tr key={exam.code}>
                    <td className="py-2.5 pr-3 font-mono text-xs">{exam.code}</td>
                    <td className="py-2.5 pr-3 font-medium text-ink-900 dark:text-ink-100">
                      {exam.name}
                    </td>
                    <td className="py-2.5 pr-3">{exam.language}</td>
                    <td className="py-2.5 pr-3 tabular-nums">{exam.durationSeconds}s</td>
                    <td className="py-2.5 pr-3 tabular-nums">{exam.passingNetWpm}</td>
                    <td className="py-2.5">{exam.errorModel}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {tab === 'stats' && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card title="Users">
            <p className="font-mono text-3xl font-semibold text-ink-900 dark:text-ink-50">
              {stats?.totalUsers ?? '—'}
            </p>
          </Card>
          <Card title="Attempts">
            <p className="font-mono text-3xl font-semibold text-ink-900 dark:text-ink-50">
              {stats?.totalAttempts ?? '—'}
            </p>
          </Card>
          <Card title="Attempts in the last seven days">
            <p className="font-mono text-3xl font-semibold text-ink-900 dark:text-ink-50">
              {stats?.attemptsLast7Days ?? '—'}
            </p>
          </Card>
          <Card title="Passages">
            <p className="font-mono text-3xl font-semibold text-ink-900 dark:text-ink-50">
              {stats?.totalPassages ?? '—'}
            </p>
          </Card>
          <Card title="Active subscriptions">
            <p className="font-mono text-3xl font-semibold text-ink-900 dark:text-ink-50">
              {stats?.activeSubscriptions ?? '—'}
            </p>
          </Card>
        </div>
      )}
    </div>
  )
}
