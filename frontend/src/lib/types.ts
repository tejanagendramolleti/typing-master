/**
 * The types the API returns.
 *
 * These mirror the backend DTOs field for field. When a DTO changes on the
 * server, the compiler here will say so.
 */

/** A user account. */
export interface User {
  id: number
  email: string
  displayName: string | null
  role: 'USER' | 'ADMIN'
  emailVerified: boolean
  preferredExamCode: string | null
  preferredLanguage: string | null
  targetWpm: number | null
  leaderboardOptOut: boolean
  showEmailOnLeaderboard: boolean
  dailyFreeLimit: number
  timezone: string | null
  createdAt: string
  lastLoginAt: string | null
}

/** The response to a successful registration or login. */
export interface AuthResponse {
  tokenType: string
  accessToken: string
  refreshToken: string
  expiresIn: number
  user: User
}

/** An exam profile. */
export interface ExamProfile {
  id: number
  code: string
  name: string
  description: string | null
  language: string
  keyboardLayout: string
  durationSeconds: number
  targetKeystrokes: number | null
  targetWords: number | null
  passingNetWpm: number
  wordLengthChars: number
  errorModel: string
  errorPenaltyPerUnit: number
  backspaceAllowed: boolean
  showLiveWpm: boolean
  alphanumeric: boolean
  minAccuracyPct: number
  sourceNote: string | null
  active: boolean
}

/** The severity of a word-level difference. */
export type ErrorType = 'WRONG' | 'MISSING' | 'EXTRA' | 'CASE' | 'PUNCTUATION' | 'SPACING'

/** One word-level difference between the passage and what was typed. */
export interface WordDiff {
  type: ErrorType
  index: number
  expected: string | null
  actual: string | null
}

/** A test that is in progress, and can be resumed. */
export interface AttemptSummary {
  attemptId: number
  examCode: string
  examName: string
  language: string
  keyboardLayout: string
  referenceText: string
  durationSeconds: number
  wordLengthChars: number
  startedAt: string
  serverTime: string
  elapsedMs: number
  remainingMs: number
  backspaceAllowed: boolean
  showLiveWpm: boolean
  passingNetWpm: number
  minAccuracyPct: number
  typedText: string
  keystrokeCount: number
  backspaceCount: number
}

/** The stored result of a finished test. */
export interface AttemptResult {
  attemptId: number
  examCode: string
  examName: string
  language: string
  keyboardLayout: string
  status: string
  grossWpm: number
  netWpm: number
  accuracyPct: number
  fullMistakes: number
  halfMistakes: number
  totalMistakes: number
  keystrokes: number
  backspaces: number
  blurCount: number
  durationMs: number
  typedChars: number
  referenceWords: number
  typedWords: number
  correctWords: number
  passed: boolean
  passingNetWpm: number
  minAccuracyPct: number
  startedAt: string
  submittedAt: string
  typedText: string
  referenceText: string
  wordDiffs: WordDiff[]
  errorBreakdown: Record<string, number>
  cheatFlags: string[]
  certificateId: number | null
}

/** The event types the client records during a test. */
export type TimingEventType =
  | 'KEYSTROKE'
  | 'BACKSPACE'
  | 'BLUR'
  | 'FOCUS'
  | 'PASTE_ATTEMPT'
  | 'DROP_ATTEMPT'
  | 'COPY_ATTEMPT'
  | 'CONTEXT_MENU'

/** One recorded event during a test. */
export interface TimingEvent {
  type: TimingEventType
  offsetMs: number
  charIndex?: number | null
  charValue?: string | null
  keyCode?: string | null
}

/** The body of a start request. */
export interface StartAttemptRequest {
  examCode: string
  passageId?: number | null
  mockTestId?: number | null
  difficulty?: string | null
}

/** The body of a submit request. */
export interface SubmitAttemptRequest {
  typedText: string
  events: TimingEvent[]
  autoSubmitted?: boolean
}

/** A pricing plan. */
export interface Plan {
  code: string
  name: string
  description: string | null
  pricePaise: number
  currency: string
  /** How long the plan runs for, in days. */
  durationDays: number
  /** FREE, MONTHLY, QUARTERLY, YEARLY or LIFETIME. */
  interval: string
  features: string[]
  highlighted: boolean
  active: boolean
}

/** The response to the plans endpoint. */
export interface PlanCatalogue {
  plans: Plan[]
  paymentsEnabled: boolean
  mode: string
}

/** A page of results, as the server sends them. */
export interface Page<T> {
  content: T[]
  totalElements: number
  totalPages: number
  number: number
  size: number
}
