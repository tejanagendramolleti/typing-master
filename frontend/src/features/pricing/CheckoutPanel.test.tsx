import { describe, expect, it, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CheckoutPanel from './CheckoutPanel'
import { renderWithProviders } from '../../test/renderWithProviders'
import type { Order, Plan } from '../../lib/types'

/**
 * What the API stub does, and what it remembers.
 *
 * The stub is a tiny fake rather than a mock, so that the test can look at
 * the request that was sent and answer with the order the server would
 * have made.
 */
const { calls, state } = vi.hoisted(() => ({
  calls: [] as { path: string; body: unknown }[],
  state: {
    authenticated: true,
    order: null as Order | null,
    paid: false,
    referenceSent: false,
  },
}))

vi.mock('../../lib/api', () => ({
  get: vi.fn(async () => null),
  post: vi.fn(async (path: string, body?: unknown) => {
    calls.push({ path, body })

    if (path.endsWith('/pay')) {
      state.paid = true
      return {
        id: 1,
        provider: 'MOCK',
        status: 'ACTIVE',
        startsAt: '2026-01-01T00:00:00Z',
        expiresAt: '2026-02-01T00:00:00Z',
        autoRenew: false,
      }
    }

    if (path.endsWith('/manual-reference')) {
      state.referenceSent = true
      return state.order
    }

    // The order is created.
    const method = (body as { paymentMethod?: string })?.paymentMethod
    state.order = {
      id: 42,
      orderNumber: 'ET123456789',
      planCode: 'PRO-MONTHLY',
      planName: 'Pro Monthly',
      provider: method === 'MANUAL' ? 'MANUAL' : 'MOCK',
      status: method === 'MANUAL' ? 'AWAITING_REVIEW' : 'PENDING',
      amountPaise: 14900,
      discountPaise: 0,
      totalPaise: 14900,
      currency: 'INR',
      manualRef: null,
      adminNote: null,
      createdAt: '2026-01-01T00:00:00Z',
      expiresAt: '2026-01-02T00:00:00Z',
    }
    return state.order
  }),
  put: vi.fn(),
  del: vi.fn(),
  request: vi.fn(),
  getAccessToken: vi.fn(() => 'test-token'),
  getRefreshToken: vi.fn(() => null),
  setTokens: vi.fn(),
  clearTokens: vi.fn(),
  hasToken: vi.fn(() => true),
  ApiError: class extends Error {},
}))

vi.mock('../../lib/useAuth', () => ({
  useAuth: () => ({
    user: null,
    isLoading: false,
    isAuthenticated: state.authenticated,
    isAdmin: false,
    signIn: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    refreshUser: vi.fn(),
    updateProfile: vi.fn(),
  }),
}))

/** The monthly plan. */
const plan: Plan = {
  code: 'PRO-MONTHLY',
  name: 'Pro Monthly',
  description: 'Everything in Pro, paid month by month.',
  pricePaise: 14900,
  currency: 'INR',
  durationDays: 30,
  interval: 'MONTHLY',
  features: ['Unlimited practice tests'],
  highlighted: true,
  active: true,
}

beforeEach(() => {
  calls.length = 0
  state.authenticated = true
  state.order = null
  state.paid = false
  state.referenceSent = false
})

describe('CheckoutPanel', () => {
  it('offers the methods the server says are on offer', () => {
    renderWithProviders(<CheckoutPanel plan={plan} methods={['MOCK', 'MANUAL']} onClose={vi.fn()} />)

    expect(screen.getByRole('button', { name: /Pay by card \(test\)/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Pay by UPI/ })).toBeInTheDocument()
  })

  it('asks a candidate who is not signed in to sign in', () => {
    state.authenticated = false
    renderWithProviders(<CheckoutPanel plan={plan} methods={['MOCK']} onClose={vi.fn()} />)

    expect(screen.getByText('Sign in to finish')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Pay by card/ })).not.toBeInTheDocument()
  })

  it('creates the order with the method the candidate chose', async () => {
    const candidate = userEvent.setup()
    renderWithProviders(<CheckoutPanel plan={plan} methods={['MOCK', 'MANUAL']} onClose={vi.fn()} />)

    await candidate.click(screen.getByRole('button', { name: /Pay by UPI/ }))

    await waitFor(() => expect(calls).toHaveLength(1))
    expect(calls[0].path).toBe('/api/v1/billing/orders')
    expect(calls[0].body).toMatchObject({ planCode: 'PRO-MONTHLY', paymentMethod: 'MANUAL' })
  })

  it('takes the payment with the development gateway', async () => {
    const candidate = userEvent.setup()
    renderWithProviders(<CheckoutPanel plan={plan} methods={['MOCK']} onClose={vi.fn()} />)

    await candidate.click(screen.getByRole('button', { name: /Pay by card \(test\)/ }))
    await candidate.click(await screen.findByRole('button', { name: 'Pay (test)' }))

    await waitFor(() => expect(screen.getByText('The Pro access is on')).toBeInTheDocument())
    expect(calls[1].path).toBe('/api/v1/billing/orders/42/pay')
  })

  it('asks for the UPI reference on the manual method', async () => {
    const candidate = userEvent.setup()
    renderWithProviders(<CheckoutPanel plan={plan} methods={['MANUAL']} onClose={vi.fn()} />)

    await candidate.click(screen.getByRole('button', { name: /Pay by UPI/ }))

    const field = await screen.findByLabelText('Transaction reference')
    await candidate.type(field, 'UPI123456')
    await candidate.click(screen.getByRole('button', { name: 'Submit reference' }))

    await waitFor(() => expect(screen.getByText('The reference has been sent')).toBeInTheDocument())
    expect(calls[1].path).toBe('/api/v1/billing/orders/42/manual-reference')
    expect(calls[1].body).toMatchObject({ manualRef: 'UPI123456' })
  })

  it('will not send an empty reference', async () => {
    const candidate = userEvent.setup()
    renderWithProviders(<CheckoutPanel plan={plan} methods={['MANUAL']} onClose={vi.fn()} />)

    await candidate.click(screen.getByRole('button', { name: /Pay by UPI/ }))

    const button = await screen.findByRole('button', { name: 'Submit reference' })
    expect(button).toBeDisabled()
  })

  it('closes when the candidate says so', async () => {
    const candidate = userEvent.setup()
    const onClose = vi.fn()
    renderWithProviders(<CheckoutPanel plan={plan} methods={['MOCK']} onClose={onClose} />)

    await candidate.click(screen.getByRole('button', { name: 'Close' }))

    expect(onClose).toHaveBeenCalled()
  })
})
