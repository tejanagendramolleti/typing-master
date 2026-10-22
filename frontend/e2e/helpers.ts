import { expect, type Page } from '@playwright/test'

/**
 * The helpers the end-to-end tests share.
 */

/** A unique email, so the tests can run against the same database twice. */
export function uniqueEmail(prefix = 'candidate'): string {
  const stamp = Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
  return `${prefix}-${stamp}@example.com`
}

/** A password that meets the rules. */
export const PASSWORD = 'ExamTyper#2026'

/**
 * Registers a candidate and signs them in.
 */
export async function register(page: Page, email: string, displayName = 'Test Candidate') {
  await page.goto('/sign-up')
  await page.getByLabel('Your name').fill(displayName)
  await page.getByLabel('Email address').fill(email)
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD)
  await page.getByLabel('Confirm the password').fill(PASSWORD)
  await page.getByRole('button', { name: 'Create the account' }).click()
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 })
}

/**
 * Signs an existing candidate in.
 */
export async function signIn(page: Page, email: string) {
  await page.goto('/sign-in')
  await page.getByLabel('Email address').fill(email)
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 })
}

/**
 * Signs in as the administrator.
 *
 * The credentials come from the environment, because the seeded passwords
 * can be changed.
 */
export async function signInAsAdmin(page: Page) {
  const email = process.env.ADMIN_EMAIL ?? 'admin@examtyper.local'
  const password = process.env.ADMIN_PASSWORD ?? 'Admin@12345'

  await page.goto('/sign-in')
  await page.getByLabel('Email address').fill(email)
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 })
}

/**
 * Types a passage into the typing area, key by key.
 *
 * The keys are sent one at a time so that the layout sees real key events
 * rather than a paste, which the application blocks.
 *
 * There is a short delay between the keys. Without one the browser sends
 * them faster than a person could type, and the server — which checks that
 * the recorded timings could have been typed — would rightly mark the
 * attempt as impossible.
 */
export async function typePassage(page: Page, text: string) {
  const area = page.getByLabel('The text you have typed')
  await area.click()

  for (const character of text) {
    if (character === ' ') {
      await page.keyboard.press('Space', { delay: KEY_DELAY_MS })
    } else {
      await page.keyboard.type(character, { delay: KEY_DELAY_MS })
    }
  }
}

/** The pause between two key presses, in milliseconds. */
const KEY_DELAY_MS = 20
