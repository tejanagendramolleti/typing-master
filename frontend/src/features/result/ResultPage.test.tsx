import { describe, expect, it, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import ResultPage from './ResultPage'
import { renderWithProviders } from '../../test/renderWithProviders'
import type { AttemptResult } from '../../lib/types'

/**
 * A finished result, for the tests to render.
 */
const RESULT: AttemptResult = {
  attemptId: 42,
  examCode: 'SSC-CHSL-EN',
  examName: 'SSC CHSL',
  language: 'EN',
  keyboardLayout: 'en-qwerty',
  status: 'SUBMITTED',
  grossWpm: 42,
  netWpm: 38,
  accuracyPct: 94.5,
  fullMistakes: 2,
  halfMistakes: 3,
  totalMistakes: 5,
  keystrokes: 1240,
  backspaces: 12,
  blurCount: 1,
  durationMs: 125_000,
  typedChars: 1180,
  referenceWords: 210,
  typedWords: 212,
  correctWords: 205,
  passed: true,
  passingNetWpm: 35,
  minAccuracyPct: 90,
  startedAt: '2026-01-01T10:00:00Z',
  submittedAt: '2026-01-01T10:02:05Z',
  typedText: 'the quick brown fox jumps over the lazy dog',
  referenceText: 'the quick brown fox jumps over the lazy dog',
  wordDiffs: [
    { type: 'WRONG', index: 2, expected: 'brown', actual: 'bown' },
    { type: 'MISSING', index: 6, expected: 'over', actual: null },
    { type: 'CASE', index: 0, expected: 'The', actual: 'the' },
  ],
  errorBreakdown: { WRONG: 2, MISSING: 1, EXTRA: 0, CASE: 1, PUNCTUATION: 0, SPACING: 0 },
  cheatFlags: [],
  certificateId: null,
}

/**
 * The result the API stub returns.
 *
 * `vi.mock` is hoisted above the imports, so the factory would run before
 * this variable was assigned. `vi.hoisted` lifts the declaration above the
 * mock, which keeps the factory able to read it.
 */
const { currentResult } = vi.hoisted(() => ({ currentResult: { value: null as unknown } }))

vi.mock('../../lib/api', () => ({
  get: vi.fn(async () => currentResult.value),
  post: vi.fn(),
  put: vi.fn(),
  del: vi.fn(),
  request: vi.fn(async () => currentResult.value),
  getAccessToken: vi.fn(() => 'test-token'),
  getRefreshToken: vi.fn(() => null),
  setTokens: vi.fn(),
  clearTokens: vi.fn(),
  hasToken: vi.fn(() => true),
  ApiError: class extends Error {
    status: number
    code: string
    fieldErrors: Record<string, string>
    requestId: string | null
    constructor(status: number, code: string, message: string) {
      super(message)
      this.status = status
      this.code = code
      this.fieldErrors = {}
      this.requestId = null
    }
  },
}))

beforeEach(() => {
  currentResult.value = RESULT
})

/**
 * Renders the result page with the API stubbed.
 */
async function renderResult(result: AttemptResult = RESULT) {
  currentResult.value = result

  renderWithProviders(<ResultPage />, {
    path: '/result/:attemptId',
    initialEntries: ['/result/42'],
  })

  await waitFor(() => {
    // The loading state renders the label with an ellipsis, so the text is
    // matched on the label alone.
    expect(screen.queryByText(/Loading the result/)).not.toBeInTheDocument()
  })
}

describe('ResultPage', () => {
  it('shows the verdict', async () => {
    await renderResult()
    expect(screen.getByText('You passed')).toBeInTheDocument()
  })

  it('says so when the candidate did not pass', async () => {
    await renderResult({ ...RESULT, passed: false, netWpm: 22 })
    expect(screen.getByText('Not this time')).toBeInTheDocument()
  })

  it('says what the accuracy floor was when the candidate did not pass', async () => {
    await renderResult({ ...RESULT, passed: false, netWpm: 22, accuracyPct: 71.5 })
    expect(
      screen.getByText(
        'To pass you needed 35 wpm and 90% accuracy. You reached 22 wpm and 71.5% accuracy.',
      ),
    ).toBeInTheDocument()
  })

  it('names the accuracy floor in the verdict when the candidate passed', async () => {
    await renderResult()
    expect(
      screen.getByText('You cleared the 35 wpm bar and the 90% accuracy floor.'),
    ).toBeInTheDocument()
  })

  it('shows the net speed', async () => {
    await renderResult()
    expect(screen.getByText('38')).toBeInTheDocument()
  })

  it('shows the accuracy', async () => {
    await renderResult()
    expect(screen.getByText('94.5%')).toBeInTheDocument()
  })

  it('shows the full and half mistake counts', async () => {
    await renderResult()
    expect(screen.getByText('Full mistakes')).toBeInTheDocument()
    expect(screen.getByText('Half mistakes')).toBeInTheDocument()
  })

  it('shows the number of keys pressed', async () => {
    await renderResult()
    expect(screen.getByText('1240')).toBeInTheDocument()
  })

  it('shows the word-by-word diff', async () => {
    await renderResult()
    expect(screen.getByText('Word by word')).toBeInTheDocument()
  })

  it('shows the error breakdown', async () => {
    await renderResult()
    expect(screen.getByText('Where the mistakes were')).toBeInTheDocument()
  })

  it('says so when there were no mistakes at all', async () => {
    await renderResult({
      ...RESULT,
      errorBreakdown: { WRONG: 0, MISSING: 0, EXTRA: 0, CASE: 0, PUNCTUATION: 0, SPACING: 0 },
    })
    expect(screen.getByText('No mistakes at all. That is a clean run.')).toBeInTheDocument()
  })

  it('flags a test that had a cheat attempt', async () => {
    await renderResult({ ...RESULT, cheatFlags: ['PASTE_ATTEMPT'] })
    expect(screen.getByText('This test was flagged')).toBeInTheDocument()
  })

  it('explains a result whose timing could not have been typed', async () => {
    await renderResult({ ...RESULT, passed: false, cheatFlags: ['IMPOSSIBLE_TELEMETRY'] })
    expect(
      screen.getByText(/could not have been produced by typing/),
    ).toBeInTheDocument()
  })

  it('does not say the score was changed for an ordinary cheat attempt', async () => {
    await renderResult({ ...RESULT, cheatFlags: ['PASTE_ATTEMPT:2'] })
    expect(screen.getByText(/does not change your score/)).toBeInTheDocument()
  })

  it('does not flag a clean test', async () => {
    await renderResult()
    expect(screen.queryByText('This test was flagged')).not.toBeInTheDocument()
  })

  it('mentions the certificate when one was earned', async () => {
    await renderResult({ ...RESULT, certificateId: 7 })
    expect(screen.getByText('You earned a certificate')).toBeInTheDocument()
  })

  it('does not mention the certificate when none was earned', async () => {
    await renderResult()
    expect(screen.queryByText('You earned a certificate')).not.toBeInTheDocument()
  })

  it('shows the time taken', async () => {
    await renderResult()
    expect(screen.getByText('2m 5s')).toBeInTheDocument()
  })

  it('offers a link to the analytics', async () => {
    await renderResult()
    expect(screen.getByText('See your trends')).toHaveAttribute('href', '/analytics')
  })
})
