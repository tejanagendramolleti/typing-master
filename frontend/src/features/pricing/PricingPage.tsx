import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Badge, Banner, Card, LoadingState, PageHeader } from '../../components/ui'
import { get, post } from '../../lib/api'
import { useAuth } from '../../lib/useAuth'
import type { PlanCatalogue } from '../../lib/types'

/** Formats a price in paise as rupees. */
function formatPrice(paise: number, currency: string): string {
  const amount = paise / 100
  const symbol = currency === 'INR' ? '₹' : currency === 'USD' ? '$' : ''
  return `${symbol}${amount % 1 === 0 ? amount.toFixed(0) : amount.toFixed(2)}`
}

/**
 * The pricing page.
 *
 * When payments are switched off, the call to action is replaced with a
 * waitlist form rather than a dead link.
 */
export default function PricingPage() {
  const { isAuthenticated } = useAuth()
  const [email, setEmail] = useState('')
  const [waitlistSent, setWaitlistSent] = useState(false)
  const [waitlistError, setWaitlistError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['plans'],
    queryFn: () => get<PlanCatalogue>('/api/v1/plans'),
  })

  async function joinWaitlist(event: React.FormEvent) {
    event.preventDefault()
    setWaitlistError(null)
    setPending(true)
    try {
      await post('/api/v1/waitlist', { email: email.trim() })
      setWaitlistSent(true)
    } catch (caught) {
      setWaitlistError(caught instanceof Error ? caught.message : 'That did not work.')
    } finally {
      setPending(false)
    }
  }

  if (isLoading) return <LoadingState label="Loading the plans" />

  const plans = data?.plans ?? []
  const paymentsEnabled = data?.paymentsEnabled ?? false

  return (
    <div className="container-page py-12">
      <PageHeader
        eyebrow="Pricing"
        title="One plan, three terms"
        description="Everything in Pro is the same. Pick the term that suits you."
      />

      {!paymentsEnabled && (
        <div className="mb-8">
          <Banner
            tone="info"
            title="Payments are switched off in this build"
            action={
              isAuthenticated ? undefined : (
                <Link to="/sign-up" className="btn-secondary btn-sm">
                  Create a free account
                </Link>
              )
            }
          >
            The billing layer is in place, but no payment provider is connected. Leave
            your address below and you will be told when it is.
          </Banner>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        {plans.map((plan) => (
          <Card
            key={plan.code}
            className={plan.highlighted ? 'ring-2 ring-accent-500' : ''}
          >
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-title">{plan.name}</h2>
              {plan.highlighted && <Badge tone="accent">Most chosen</Badge>}
            </div>

            <p className="text-muted mt-1">{plan.description}</p>

            <div className="mt-5 flex items-baseline gap-2">
              <span className="font-mono text-3xl font-semibold tracking-tight text-ink-900 dark:text-ink-50">
                {formatPrice(plan.pricePaise, plan.currency)}
              </span>
              <span className="text-sm text-ink-500 dark:text-ink-400">
                {plan.durationDays === 365
                  ? 'a year'
                  : plan.durationDays === 90
                    ? 'a quarter'
                    : plan.durationDays === 0
                      ? 'always free'
                      : 'a month'}
              </span>
            </div>

            <ul className="mt-6 space-y-2.5 text-sm text-ink-600 dark:text-ink-300">
              {plan.features.map((feature) => (
                <li key={feature} className="flex gap-2">
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="mt-0.5 h-4 w-4 shrink-0 text-accent-600 dark:text-accent-400"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.7 5.3a1 1 0 0 1 0 1.4l-8 8a1 1 0 0 1-1.4 0l-4-4a1 1 0 1 1 1.4-1.4L8 12.6l7.3-7.3a1 1 0 0 1 1.4 0Z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {feature}
                </li>
              ))}
            </ul>

            <div className="mt-6">
              {paymentsEnabled ? (
                <button type="button" className="btn-primary w-full">
                  {plan.highlighted ? 'Choose this plan' : 'Choose this plan'}
                </button>
              ) : (
                <button type="button" disabled className="btn-secondary w-full">
                  Not available yet
                </button>
              )}
            </div>
          </Card>
        ))}
      </div>

      {!paymentsEnabled && (
        <div className="mx-auto mt-10 max-w-md">
          <Card title="Join the waitlist">
            {waitlistSent ? (
              <Banner tone="good" title="You are on the list">
                We will write to you when payments are switched on.
              </Banner>
            ) : (
              <form onSubmit={joinWaitlist} className="stack">
                {waitlistError && (
                  <Banner tone="bad" title="That did not work">
                    {waitlistError}
                  </Banner>
                )}
                <div>
                  <label htmlFor="waitlist-email" className="label">
                    Email address
                  </label>
                  <input
                    id="waitlist-email"
                    type="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="input"
                  />
                </div>
                <button type="submit" disabled={pending} className="btn-primary w-full">
                  {pending ? 'Adding you…' : 'Add me to the list'}
                </button>
              </form>
            )}
          </Card>
        </div>
      )}

      <div className="mt-12">
        <Card title="What the free tier includes">
          <ul className="grid gap-3 text-sm text-ink-600 sm:grid-cols-2 dark:text-ink-300">
            <li className="flex gap-2">
              <span aria-hidden="true" className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-accent-500" />
              Three practice tests a day, counted on the server.
            </li>
            <li className="flex gap-2">
              <span aria-hidden="true" className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-accent-500" />
              Every language, in both the free and the regional language.
            </li>
            <li className="flex gap-2">
              <span aria-hidden="true" className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-accent-500" />
              The full result: speed, accuracy, mistakes and the word-by-word diff.
            </li>
            <li className="flex gap-2">
              <span aria-hidden="true" className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-accent-500" />
              No card, no trial that expires.
            </li>
          </ul>
        </Card>
      </div>
    </div>
  )
}
