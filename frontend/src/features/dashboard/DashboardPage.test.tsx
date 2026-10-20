import { describe, expect, it, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import DashboardPage from './DashboardPage'
import { renderWithProviders } from '../../test/renderWithProviders'
import type { ExamProfile } from '../../lib/types'

/**
 * The quota the API stub returns. The tests change it to see the paywall.
 */
const { state } = vi.hoisted(() => ({
  state: {
    quota: {
      used: 1,
      limit: 3,
      remaining: 2,
      isPro: false,
      resetsAt: '2026-01-02T00:00:00Z',
    },
    attempts: [] as unknown[],
    exams: [
      {
        id: 1,
        code: 'SSC-CHSL-EN',
        name: 'SSC CHSL',
        description: 'English',
        language: 'EN',
        keyboardLayout: 'en-qwerty',
        durationSeconds: 600,
        targetKeystrokes: 1800,
        targetWords: 360,
        passingNetWpm: 35,
        wordLengthChars: 5,
        errorModel: 'FULL_AND_HALF_MISTAKES',
        errorPenaltyPerUnit: 0,
        backspaceAllowed: false,
        showLiveWpm: true,
        alphanumeric: false,
        minAccuracyPct: 92,
        sourceNote: null,
        active: true,
      },
    ] as ExamProfile[],
  },
}))

vi.mock('../../lib/api', () => ({
  get: vi.fn(async (path: string) => {
    if (path.includes('/quota')) return state.quota
    if (path.includes('/attempts/recent')) return state.attempts
    if (path.includes('/attempts/resumable')) return []
    if (path.includes('/exams')) return state.exams
    return null
  }),
  post: vi.fn(),
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
    user: {
      id: 1,
      email: 'candidate@example.com',
      displayName: 'Candidate',
      role: 'USER',
      emailVerified: true,
      preferredExamCode: null,
      preferredLanguage: 'EN',
      targetWpm: 40,
      leaderboardOptOut: false,
      showEmailOnLeaderboard: false,
      dailyFreeLimit: 3,
      timezone: 'Asia/Kolkata',
      createdAt: '2026-01-01T00:00:00Z',
      lastLoginAt: null,
    },
    isLoading: false,
    isAuthenticated: true,
    isAdmin: false,
    signIn: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    refreshUser: vi.fn(),
    updateProfile: vi.fn(),
  }),
}))

beforeEach(() => {
  state.quota = {
    used: 1,
    limit: 3,
    remaining: 2,
    isPro: false,
    resetsAt: '2026-01-02T00:00:00Z',
  }
  state.attempts = []
})

/**
 * Renders the dashboard and waits for the data to arrive.
 */
async function renderDashboard() {
  renderWithProviders(<DashboardPage />, { path: '/dashboard', initialEntries: ['/dashboard'] })
  await waitFor(() => {
    expect(screen.queryByText(/Loading your results/)).not.toBeInTheDocument()
  })
}

describe('DashboardPage', () => {
  it('welcomes the candidate by name', async () => {
    await renderDashboard()
    expect(screen.getByText(/Welcome back/)).toBeInTheDocument()
    expect(screen.getByText(/Candidate/)).toBeInTheDocument()
  })

  it('shows how many tests are left today', async () => {
    await renderDashboard()
    expect(screen.getByText('Tests used today')).toBeInTheDocument()
    expect(screen.getByText('1 of 3')).toBeInTheDocument()
  })

  it('does not show the upgrade prompt when the allowance remains', async () => {
    await renderDashboard()
    expect(screen.queryByText("You have used today's three tests")).not.toBeInTheDocument()
  })

  it('shows the upgrade prompt when the allowance is spent', async () => {
    state.quota = {
      used: 3,
      limit: 3,
      remaining: 0,
      isPro: false,
      resetsAt: '2026-01-02T00:00:00Z',
    }
    await renderDashboard()
    expect(screen.getByText("You have used today's three tests")).toBeInTheDocument()
  })

  it('offers a link to the plans in the upgrade prompt', async () => {
    state.quota = {
      used: 3,
      limit: 3,
      remaining: 0,
      isPro: false,
      resetsAt: '2026-01-02T00:00:00Z',
    }
    await renderDashboard()
    expect(screen.getByText('See the plans')).toHaveAttribute('href', '/pricing')
  })

  it('does not show the upgrade prompt to a Pro member', async () => {
    state.quota = {
      used: 40,
      limit: 3,
      remaining: 0,
      isPro: true,
      resetsAt: '2026-01-02T00:00:00Z',
    }
    await renderDashboard()
    expect(screen.queryByText("You have used today's three tests")).not.toBeInTheDocument()
  })

  it('says the member is on the Pro plan', async () => {
    state.quota = {
      used: 40,
      limit: 3,
      remaining: 0,
      isPro: true,
      resetsAt: '2026-01-02T00:00:00Z',
    }
    await renderDashboard()
    expect(screen.getByText('Pro')).toBeInTheDocument()
  })

  it('shows an empty state when there are no results', async () => {
    await renderDashboard()
    expect(screen.getByText('No tests yet')).toBeInTheDocument()
  })

  it('shows the recent results when there are some', async () => {
    state.attempts = [
      {
        attemptId: 1,
        examCode: 'SSC-CHSL-EN',
        examName: 'SSC CHSL',
        netWpm: 38,
        accuracyPct: 94.5,
        passed: true,
        submittedAt: '2026-01-01T10:00:00Z',
      },
    ]
    await renderDashboard()
    expect(screen.queryByText('No tests yet')).not.toBeInTheDocument()
    expect(screen.getByText('38')).toBeInTheDocument()
  })

  it('links a result to its page', async () => {
    state.attempts = [
      {
        attemptId: 7,
        examCode: 'SSC-CHSL-EN',
        examName: 'SSC CHSL',
        netWpm: 38,
        accuracyPct: 94.5,
        passed: true,
        submittedAt: '2026-01-01T10:00:00Z',
      },
    ]
    await renderDashboard()
    // The exam name appears twice: in the results table and in the shortcut
    // list. The table entry is the one that links to the result.
    const links = screen.getAllByText('SSC CHSL').filter((element) =>
      element.getAttribute('href')?.startsWith('/result/'),
    )
    expect(links).toHaveLength(1)
    expect(links[0]).toHaveAttribute('href', '/result/7')
  })
})
