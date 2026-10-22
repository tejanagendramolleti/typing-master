import { describe, expect, it, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AdminOrders from './AdminOrders'
import { renderWithProviders } from '../../test/renderWithProviders'
import type { AdminOrder } from '../../lib/types'

/**
 * The orders the stub returns, and the requests it has been asked for.
 */
const { calls, state } = vi.hoisted(() => ({
  calls: [] as { path: string; body: unknown }[],
  state: {
    orders: [] as AdminOrder[],
  },
}))

vi.mock('../../lib/api', () => ({
  get: vi.fn(async (path: string) => {
    if (path.includes('/admin/orders')) {
      return {
        content: state.orders,
        totalElements: state.orders.length,
        totalPages: 1,
        number: 0,
        size: 50,
      }
    }
    return null
  }),
  post: vi.fn(async (path: string, body?: unknown) => {
    calls.push({ path, body })
    return { id: 1, provider: 'MANUAL', status: 'ACTIVE', startsAt: '', expiresAt: '', autoRenew: false }
  }),
  put: vi.fn(),
  patch: vi.fn(),
  del: vi.fn(),
  request: vi.fn(),
  getAccessToken: vi.fn(() => 'test-token'),
  getRefreshToken: vi.fn(() => null),
  setTokens: vi.fn(),
  clearTokens: vi.fn(),
  hasToken: vi.fn(() => true),
  ApiError: class extends Error {},
}))

/** An order waiting for the administrator. */
const waiting: AdminOrder = {
  id: 7,
  orderNumber: 'ET0000001',
  userId: 3,
  userEmail: 'buyer@example.com',
  planName: 'Pro Monthly',
  provider: 'MANUAL',
  status: 'AWAITING_REVIEW',
  amountPaise: 14900,
  discountPaise: 0,
  totalPaise: 14900,
  currency: 'INR',
  manualRef: 'UPI123456',
  manualNote: null,
  adminNote: null,
  createdAt: '2026-01-01T00:00:00Z',
  reviewedAt: null,
}

beforeEach(() => {
  calls.length = 0
  state.orders = [waiting]
})

describe('AdminOrders', () => {
  it('shows whose order it is, so the payment can be matched', async () => {
    renderWithProviders(<AdminOrders />)

    await waitFor(() => expect(screen.getByText('buyer@example.com')).toBeInTheDocument())
    expect(screen.getByText('ET0000001')).toBeInTheDocument()
    expect(screen.getByText('Pro Monthly')).toBeInTheDocument()
    expect(screen.getByText('UPI123456')).toBeInTheDocument()
  })

  it('approves an order and says so', async () => {
    const candidate = userEvent.setup()
    renderWithProviders(<AdminOrders />)

    await candidate.click(await screen.findByRole('button', { name: 'Approve' }))

    await waitFor(() => expect(calls).toHaveLength(1))
    expect(calls[0].path).toBe('/api/v1/admin/orders/7/approve')
    await waitFor(() =>
      expect(screen.getByText('The order is approved and the Pro access is on.')).toBeInTheDocument(),
    )
  })

  it('rejects an order and says so', async () => {
    const candidate = userEvent.setup()
    renderWithProviders(<AdminOrders />)

    await candidate.click(await screen.findByRole('button', { name: 'Reject' }))

    await waitFor(() => expect(calls).toHaveLength(1))
    expect(calls[0].path).toBe('/api/v1/admin/orders/7/reject')
  })

  it('sends the note with the decision', async () => {
    const candidate = userEvent.setup()
    renderWithProviders(<AdminOrders />)

    await candidate.type(screen.getByLabelText(/A note for the next order/), 'Checked')
    await candidate.click(await screen.findByRole('button', { name: 'Approve' }))

    await waitFor(() => expect(calls).toHaveLength(1))
    expect(calls[0].body).toEqual({ note: 'Checked' })
  })

  it('offers no decision on an order that has been settled', async () => {
    state.orders = [{ ...waiting, status: 'APPROVED' }]
    renderWithProviders(<AdminOrders />)

    await waitFor(() => expect(screen.getByText('buyer@example.com')).toBeInTheDocument())
    expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Reject' })).not.toBeInTheDocument()
  })

  it('says so when there are no orders', async () => {
    state.orders = []
    renderWithProviders(<AdminOrders />)

    await waitFor(() => expect(screen.getByText('No orders yet')).toBeInTheDocument())
  })
})
