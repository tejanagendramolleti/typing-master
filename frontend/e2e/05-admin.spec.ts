import { expect, test } from '@playwright/test'
import { signInAsAdmin, uniqueEmail } from './helpers'

/**
 * The sixth flow: the administrator adds a passage and it appears in a
 * test.
 */
test.describe('The admin panel', () => {
  test('an administrator can add a passage and it appears in the catalogue', async ({ page }) => {
    await signInAsAdmin(page)

    await page.goto('/admin')
    await expect(page.getByRole('heading', { name: 'The admin panel' })).toBeVisible()

    // ---- The import panel is there ----
    await page.getByRole('tab', { name: 'Passages' }).click()
    await expect(page.getByText('Import passages')).toBeVisible()

    // ---- A passage is added through the import ----
    const title = 'Added by the administrator ' + Date.now().toString(36)
    const content =
      'The administration department has issued a notice about the maintenance of the '
      + 'office building. The lifts will be out of service on the tenth and the eleventh '
      + 'of every month while the machinery is serviced, and the staff are asked to use '
      + 'the stairs in the meantime. The notice is displayed at the main entrance.'

    await page.getByRole('button', { name: 'JSON' }).click()
    await page.getByLabel('The file').fill(
      JSON.stringify([
        { title, content, language: 'EN', difficulty: 'EASY' },
      ]),
    )

    // The preview says what would happen before anything is done.
    await page.getByRole('button', { name: 'Preview' }).click()
    await expect(page.getByText(/would be imported/)).toBeVisible({ timeout: 30_000 })

    await page.getByRole('button', { name: 'Import', exact: true }).click()
    await expect(page.getByText(/passage.* imported|imported,/i)).toBeVisible({ timeout: 30_000 })

    // ---- The passage is in the bank ----
    await expect(page.getByText(title)).toBeVisible({ timeout: 30_000 })
  })

  test('an administrator can look at the summary figures', async ({ page }) => {
    await signInAsAdmin(page)

    await page.goto('/admin')
    await page.getByRole('tab', { name: 'Summary' }).click()

    await expect(page.getByText('Users')).toBeVisible()
    await expect(page.getByText('Attempts')).toBeVisible()
    await expect(page.getByText('Passages')).toBeVisible()
  })

  test('a candidate cannot reach the admin panel', async ({ page }) => {
    await page.goto('/sign-up')
    await page.getByLabel('Your name').fill('Not An Admin')
    await page.getByLabel('Email address').fill(uniqueEmail('notadmin'))
    await page.getByLabel('Password', { exact: true }).fill('ExamTyper#2026')
    await page.getByLabel('Confirm the password').fill('ExamTyper#2026')
    await page.getByRole('button', { name: 'Create the account' }).click()
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 })

    // The route sends a candidate who is not an administrator away.
    await page.goto('/admin')
    await expect(page).not.toHaveURL(/\/admin/, { timeout: 15_000 })
  })
})
