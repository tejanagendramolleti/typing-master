/**
 * Scoring + local history. Pure functions and localStorage — no server.
 */

export interface TestStats {
  grossWpm: number
  netWpm: number
  accuracy: number
  correctChars: number
  totalTyped: number
  elapsedSeconds: number
}

export interface HistoryEntry extends TestStats {
  id: string
  date: string
  scenario: string
  durationSeconds: number
}

const HISTORY_KEY = 'typing-test.history.v1'
const BEST_KEY = 'typing-test.best.v1'
const MAX_HISTORY = 25

/** Standard WPM: (chars / 5) / minutes. Net counts only correct chars. */
export function computeStats(
  typed: string,
  reference: string,
  elapsedSeconds: number,
): TestStats {
  const elapsedMin = Math.max(elapsedSeconds / 60, 1 / 60)
  const totalTyped = typed.length
  let correctChars = 0
  for (let i = 0; i < totalTyped; i += 1) {
    if (typed[i] === reference[i]) correctChars += 1
  }
  const accuracy = totalTyped === 0 ? 100 : (correctChars / totalTyped) * 100
  return {
    grossWpm: Math.round(totalTyped / 5 / elapsedMin),
    netWpm: Math.round(correctChars / 5 / elapsedMin),
    accuracy: Math.round(accuracy * 10) / 10,
    correctChars,
    totalTyped,
    elapsedSeconds: Math.round(elapsedSeconds),
  }
}

/** Live WPM for the HUD while typing (uses elapsed wall time). */
export function liveWpm(typedLength: number, elapsedSeconds: number): number {
  if (elapsedSeconds < 1) return 0
  return Math.round(typedLength / 5 / (elapsedSeconds / 60))
}

export function loadHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as HistoryEntry[]
    return Array.isArray(parsed) ? parsed.slice(0, MAX_HISTORY) : []
  } catch {
    return []
  }
}

export function saveResult(entry: Omit<HistoryEntry, 'id' | 'date'>): {
  entry: HistoryEntry
  isPersonalBest: boolean
} {
  const full: HistoryEntry = {
    ...entry,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    date: new Date().toISOString(),
  }
  try {
    const history = loadHistory()
    localStorage.setItem(HISTORY_KEY, JSON.stringify([full, ...history].slice(0, MAX_HISTORY)))
  } catch {
    /* Private browsing: history simply does not persist. */
  }
  let best = 0
  try {
    best = Number(localStorage.getItem(BEST_KEY) ?? 0)
  } catch {
    best = 0
  }
  const isPersonalBest = full.netWpm > best
  if (isPersonalBest) {
    try {
      localStorage.setItem(BEST_KEY, String(full.netWpm))
    } catch {
      /* Ignore persistence failures. */
    }
  }
  return { entry: full, isPersonalBest }
}

export function loadBest(): number {
  try {
    return Number(localStorage.getItem(BEST_KEY) ?? 0)
  } catch {
    return 0
  }
}
