import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Badge, Banner, Card, EmptyState, LoadingState } from '../../components/ui'
import { get, post } from '../../lib/api'
import type { AdminOrder, Page } from '../../lib/types'
import { formatPrice } from '../../lib/formatPrice'

/** The colour of a status pill. */
function statusTone(status: string): 'neutral' | 'accent' | 'good' | 'warn' | 'bad' {
  if (status === 'PAID' || status === 'APPROVED') return 'good'
  if (status === 'REJECTED' || status === 'FAILED' || status === 'CANCELLED') return 'bad'
  if (status === 'AWAITING_REVIEW') return 'warn'
  if (status === 'PENDING' || status === 'CREATED') return 'accent'
  return 'neutral'
}

/**
 * The orders, for the administrator.
 *
 * The manual gateway needs somebody to look at the payment and say whether
 * it arrived, and this is where that happens. The approval turns the Pro
 * access on; the rejection says no and leaves the candidate on the free
 * tier.
 */
export default function AdminOrders() {
  const queryClient = useQueryClient()
  const [note, setNote] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'orders'],
    queryFn: () => get<Page<AdminOrder>>('/api/v1/admin/orders?size=50'),
  })

  const settle = useMutation({
    mutationFn: (input: { id: number; action: 'approve' | 'reject' }) =>
      post(`/api/v1/admin/orders/${input.id}/${input.action}`, { note: note.trim() || null }),
    onSuccess: (_result, input) => {
      setError(null)
      setMessage(
        input.action === 'approve'
          ? 'The order is approved and the Pro access is on.'
          : 'The order is rejected.',
      )
      setNote('')
      void queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] })
    },
    onError: (caught) => {
      setError(caught instanceof Error ? caught.message : 'That did not work.')
    },
  })

  const orders = data?.content ?? []

  return (
    <Card
      title="The orders"
      description="The manual payments are approved here. The candidate's email is shown so that the payment can be matched against a bank statement."
    >
      <div className="stack">
        <div>
          <label htmlFor="order-note" className="label">
            A note for the next order you settle
          </label>
          <input
            id="order-note"
            className="input"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Checked against the payment on 12 March"
          />
        </div>

        {message && <Banner tone="good">{message}</Banner>}
        {error && <Banner tone="bad" title="That did not work">{error}</Banner>}

        {isLoading ? (
          <LoadingState label="Loading the orders" />
        ) : orders.length === 0 ? (
          <EmptyState title="No orders yet" description="Nobody has bought a plan yet." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-ink-200 dark:border-ink-800">
                  <th className="py-2 pr-3 font-medium text-ink-500 dark:text-ink-400">Order</th>
                  <th className="py-2 pr-3 font-medium text-ink-500 dark:text-ink-400">Candidate</th>
                  <th className="py-2 pr-3 font-medium text-ink-500 dark:text-ink-400">Plan</th>
                  <th className="py-2 pr-3 font-medium text-ink-500 dark:text-ink-400">Amount</th>
                  <th className="py-2 pr-3 font-medium text-ink-500 dark:text-ink-400">Method</th>
                  <th className="py-2 pr-3 font-medium text-ink-500 dark:text-ink-400">Reference</th>
                  <th className="py-2 pr-3 font-medium text-ink-500 dark:text-ink-400">State</th>
                  <th className="py-2 font-medium text-ink-500 dark:text-ink-400">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100 dark:divide-ink-800">
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td className="py-2.5 pr-3 font-mono text-xs">{order.orderNumber}</td>
                    <td className="py-2.5 pr-3">{order.userEmail}</td>
                    <td className="py-2.5 pr-3">{order.planName}</td>
                    <td className="py-2.5 pr-3 tabular-nums">
                      {formatPrice(order.totalPaise, order.currency)}
                    </td>
                    <td className="py-2.5 pr-3">{order.provider}</td>
                    <td className="py-2.5 pr-3 font-mono text-xs">{order.manualRef ?? '—'}</td>
                    <td className="py-2.5 pr-3">
                      <Badge tone={statusTone(order.status)}>{order.status}</Badge>
                    </td>
                    <td className="py-2.5">
                      {order.status === 'AWAITING_REVIEW' ? (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            className="btn-primary btn-sm"
                            disabled={settle.isPending}
                            onClick={() => settle.mutate({ id: order.id, action: 'approve' })}
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            className="btn-secondary btn-sm"
                            disabled={settle.isPending}
                            onClick={() => settle.mutate({ id: order.id, action: 'reject' })}
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-ink-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Card>
  )
}
