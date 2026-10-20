import { useState } from 'react'
import type { FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Badge, Banner, Card, PageHeader } from '../../components/ui'
import { get } from '../../lib/api'

/** What the verification endpoint returns. */
interface CertificateVerification {
  found: boolean
  certificateNumber: string
  holderName: string | null
  examCode: string
  examName: string
  netWpm: number
  accuracyPct: number
  passed: boolean
  issuedAt: string
  valid: boolean
}

/**
 * The public certificate verification page.
 *
 * The number is long and unguessable, so knowing it is the whole of the
 * check. There is no account and no sign-in.
 */
export default function CertificateVerifyPage() {
  const [number, setNumber] = useState('')
  const [searched, setSearched] = useState<string | null>(null)

  const { data, isFetching } = useQuery({
    queryKey: ['certificate', searched],
    queryFn: () => get<CertificateVerification>(`/api/v1/certificates/verify/${searched}`),
    enabled: Boolean(searched),
    retry: false,
  })

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const trimmed = number.trim()
    if (trimmed) setSearched(trimmed)
  }

  return (
    <div className="container-page py-12">
      <PageHeader
        eyebrow="Certificates"
        title="Verify a certificate"
        description="Paste the certificate number to see what it says and whether it is genuine."
      />

      <div className="mx-auto max-w-2xl">
        <Card>
          <form onSubmit={handleSubmit} className="stack">
            <div>
              <label htmlFor="certificate-number" className="label">
                Certificate number
              </label>
              <input
                id="certificate-number"
                type="text"
                value={number}
                onChange={(event) => setNumber(event.target.value)}
                placeholder="ET-XXXX-XXXX-XXXX"
                className="input font-mono"
              />
            </div>
            <button type="submit" disabled={!number.trim() || isFetching} className="btn-primary">
              {isFetching ? 'Checking…' : 'Verify'}
            </button>
          </form>
        </Card>

        {searched && !isFetching && data && (
          <div className="mt-6">
            {data.found ? (
              <Card title="The certificate">
                <div className="mb-4">
                  <Badge tone={data.valid ? 'good' : 'bad'}>
                    {data.valid ? 'Valid' : 'Not valid'}
                  </Badge>
                </div>
                <dl className="space-y-3 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-ink-500 dark:text-ink-400">Number</dt>
                    <dd className="font-mono text-ink-900 dark:text-ink-100">
                      {data.certificateNumber}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-ink-500 dark:text-ink-400">Holder</dt>
                    <dd className="text-ink-900 dark:text-ink-100">
                      {data.holderName ?? 'Not shown'}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-ink-500 dark:text-ink-400">Examination</dt>
                    <dd className="text-ink-900 dark:text-ink-100">{data.examName}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-ink-500 dark:text-ink-400">Net speed</dt>
                    <dd className="font-mono text-ink-900 dark:text-ink-100">
                      {data.netWpm} wpm
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-ink-500 dark:text-ink-400">Accuracy</dt>
                    <dd className="font-mono text-ink-900 dark:text-ink-100">
                      {data.accuracyPct.toFixed(1)}%
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-ink-500 dark:text-ink-400">Issued</dt>
                    <dd className="text-ink-900 dark:text-ink-100">
                      {new Date(data.issuedAt).toLocaleDateString()}
                    </dd>
                  </div>
                </dl>
              </Card>
            ) : (
              <Banner tone="bad" title="No certificate with that number">
                Check the number for a mistyped character. If it is right, the certificate
                may have been withdrawn.
              </Banner>
            )}
          </div>
        )}

        {searched && !isFetching && !data && (
          <div className="mt-6">
            <Banner tone="bad" title="That number could not be checked">
              The verification service did not answer. Please try again in a moment.
            </Banner>
          </div>
        )}

        <p className="text-muted mt-8 text-center">
          A certificate is a record of a practice test, not a qualification. It is not
          issued by any examination authority.
        </p>
      </div>
    </div>
  )
}
