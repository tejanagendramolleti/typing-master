import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Banner, Card } from '../../components/ui'
import { post } from '../../lib/api'
import { useAuth } from '../../lib/useAuth'
import type { Order, Plan, Subscription } from '../../lib/types'
import { formatPrice } from '../../lib/formatPrice'

/**
 * The checkout.
 *
 * The panel is shown once the candidate has chosen a plan. It works in
 * three steps:
 *
 * 1. The candidate chooses how to pay. The methods on offer come from the
 *    server, because which ones there are is a deployment decision.
 * 2. The order is created, because the order is what the payment is made
 *    against.
 * 3. The order is settled — by the development gateway, or by an
 *    administrator once the candidate has paid by UPI.
 *
 * There is no payment provider in this build, so nothing here talks to one.
 * The billing layer is written against a provider-neutral interface, and a
 * real provider can be added without changing this panel.
 */
interface CheckoutPanelProps {
  /** The plan the candidate has chosen. */
  plan: Plan
  /** The payment methods on offer: MOCK, MANUAL, or both. */
  methods: string[]
  /** Called when the candidate closes the panel. */
  onClose: () => void
}

/** What the candidate is told about a method. */
function methodName(method: string): string {
  if (method === 'MANUAL') return 'Pay by UPI'
  if (method === 'MOCK') return 'Pay by card (test)'
  return method
}

/** What the candidate is told about a method, in a sentence. */
function methodDescription(method: string): string {
  if (method === 'MANUAL') {
    return 'Pay by UPI and give the transaction reference. An administrator approves it, usually within a few minutes.'
  }
  if (method === 'MOCK') {
    return 'The development gateway. The subscription turns on at once, and no money changes hands.'
  }
  return ''
}

export default function CheckoutPanel({ plan, methods, onClose }: CheckoutPanelProps) {
  const { isAuthenticated } = useAuth()
  const queryClient = useQueryClient()
  const [reference, setReference] = useState('')

  /**
   * The order is created when the candidate picks a method, because the
   * method is part of the order.
   *
   * The idempotency key is unique to the attempt, so a second click gives
   * a second order rather than the first one again — but a request that
   * was retried by the network gives the same order back.
   */
  const order = useMutation({
    mutationFn: (method: string) =>
      post<Order>('/api/v1/billing/orders', {
        planCode: plan.code,
        paymentMethod: method,
        idempotencyKey: `checkout-${plan.code}-${crypto.randomUUID()}`,
      }),
  })

  const pay = useMutation({
    mutationFn: (orderId: number) =>
      post<Subscription>(`/api/v1/billing/orders/${orderId}/pay`),
    onSuccess: () => {
      // The allowance and the plan on the dashboard are both wrong now.
      queryClient.invalidateQueries({ queryKey: ['quota'] })
      queryClient.invalidateQueries({ queryKey: ['subscription'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })

  const submitReference = useMutation({
    mutationFn: (orderId: number) =>
      post<Order>(`/api/v1/billing/orders/${orderId}/manual-reference`, {
        manualRef: reference.trim(),
        note: null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
  })

  const created = order.data
  const error = order.error ?? pay.error ?? submitReference.error

  return (
    <Card
      className="mb-8"
      title={`${plan.name} — ${formatPrice(plan.pricePaise, plan.currency)}`}
      description={
        plan.durationDays === 365
          ? 'A year of Pro.'
          : plan.durationDays === 90
            ? 'Three months of Pro.'
            : 'A month of Pro.'
      }
    >
      {!isAuthenticated ? (
        <Banner
          tone="info"
          title="Sign in to finish"
          action={
            <Link to="/sign-in" className="btn-secondary btn-sm">
              Sign in
            </Link>
          }
        >
          The checkout needs an account, so that the plan has somebody to belong to.
        </Banner>
      ) : !created ? (
        <div className="stack">
          <p className="text-muted">How would you like to pay?</p>

          {methods.map((method) => (
            <button
              key={method}
              type="button"
              className="rounded-xl border border-ink-200 p-4 text-left transition-colors hover:border-accent-400 dark:border-ink-700 dark:hover:border-accent-600"
              disabled={order.isPending}
              onClick={() => order.mutate(method)}
            >
              <span className="block text-sm font-semibold text-ink-900 dark:text-ink-50">
                {methodName(method)}
              </span>
              <span className="mt-1 block text-sm text-ink-600 dark:text-ink-300">
                {methodDescription(method)}
              </span>
            </button>
          ))}

          {order.isError && (
            <Banner tone="bad" title="The order could not be created">
              {error instanceof Error ? error.message : 'That did not work.'}
            </Banner>
          )}

          <button type="button" className="btn-ghost btn-sm self-start" onClick={onClose}>
            Close
          </button>
        </div>
      ) : (
        <div className="stack">
          <p className="text-muted">
            Order <span className="font-mono">{created.orderNumber}</span> —{' '}
            {formatPrice(created.totalPaise, created.currency)}
            {created.discountPaise > 0 && (
              <> (a discount of {formatPrice(created.discountPaise, created.currency)})</>
            )}
          </p>

          {pay.isSuccess ? (
            <Banner tone="good" title="The Pro access is on">
              The subscription is active. Every mock series and every report is available
              now.
            </Banner>
          ) : submitReference.isSuccess ? (
            <Banner tone="good" title="The reference has been sent">
              An administrator will match it against the payment and turn the access on.
              It usually takes a few minutes.
            </Banner>
          ) : created.provider === 'MANUAL' ? (
            <div className="stack">
              <p className="text-muted">
                Pay {formatPrice(created.totalPaise, created.currency)} by UPI, using the order
                number as the note, and then give the transaction reference here.
              </p>
              <div>
                <label htmlFor="manual-reference" className="label">
                  Transaction reference
                </label>
                <input
                  id="manual-reference"
                  className="input"
                  value={reference}
                  onChange={(event) => setReference(event.target.value)}
                  placeholder="The reference from your payment app"
                />
              </div>
              {submitReference.isError && (
                <Banner tone="bad" title="The reference could not be sent">
                  {submitReference.error instanceof Error
                    ? submitReference.error.message
                    : 'That did not work.'}
                </Banner>
              )}
              <button
                type="button"
                className="btn-primary self-start"
                disabled={submitReference.isPending || reference.trim() === ''}
                onClick={() => submitReference.mutate(created.id)}
              >
                {submitReference.isPending ? 'Sending…' : 'Submit reference'}
              </button>
            </div>
          ) : (
            <div className="stack">
              {pay.isError && (
                <Banner tone="bad" title="The payment could not be taken">
                  {pay.error instanceof Error ? pay.error.message : 'That did not work.'}
                </Banner>
              )}
              <button
                type="button"
                className="btn-primary self-start"
                disabled={pay.isPending}
                onClick={() => pay.mutate(created.id)}
              >
                {pay.isPending ? 'Paying…' : 'Pay (test)'}
              </button>
              <p className="text-muted text-sm">
                This is the development gateway. No money changes hands and no card is asked
                for.
              </p>
            </div>
          )}

          <button type="button" className="btn-ghost btn-sm self-start" onClick={onClose}>
            Close
          </button>
        </div>
      )}
    </Card>
  )
}
