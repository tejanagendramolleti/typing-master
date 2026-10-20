import { expect, test } from '@playwright/test'
import { register, uniqueEmail } from './helpers'

/**
 * The second flow: use up the free allowance and see the upgrade prompt.
 */
test.describe('The free allowance', () => {
  test('a free candidate is asked to upgrade once the three tests are spent', async ({ page }) => {
    await register(page, uniqueEmail())

    // Three tests, one after the other.
    for (let attempt = 0; attempt < 3; attempt++) {
      await page.goto('/exams')
      await page.getByRole('link', { name: /SSC CHSL/ }).first().click()
      await page.getByRole('button', { name: 'Start the test' }).click()
      await expect(page).toHaveURL(/\/test\/\d+/, { timeout: 30_000 })

      // Nothing is typed, and the test is submitted straight away.
      await page.getByRole('button', { name: 'Submit' }).click()
      await expect(page).toHaveURL(/\/result\/\d+/, { timeout: 30_000 })
    }

    // ---- The fourth test is refused ----
    await page.goto('/exams')
    await page.getByRole('link', { name: /SSC CHSL/ }).first().click()
    await page.getByRole('button', { name: 'Start the test' }).click()

    // The server refuses, so the interface shows the message.
    await expect(page.getByText(/used today's three free tests|used today/i).first()).toBeVisible({
      timeout: 30_000,
    })

    // ---- The dashboard shows the upgrade prompt ----
    await page.goto('/dashboard')
    await expect(page.getByText("You have used today's three tests")).toBeVisible()
    await expect(page.getByRole('link', { name: 'See the plans' })).toBeVisible()
  })
})
