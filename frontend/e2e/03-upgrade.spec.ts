import { expect, test, type Page } from '@playwright/test'
import { register, signInAsAdmin, uniqueEmail } from './helpers'

/**
 * The third flow: upgrade with the test gateway, take a Pro mock, and see
 * the analytics and the weak-key report.
 *
 * The fourth flow is the manual one: a UPI request is submitted, an
 * administrator approves it, and the Pro access turns on.
 */

/** Opens the checkout for the monthly plan. */
async function chooseTheMonthlyPlan(page: Page) {
  await page.goto('/pricing')
  await page.locator('button[data-plan="PRO-MONTHLY"]').click()
  await expect(page.getByText('How would you like to pay?')).toBeVisible()
}

test.describe('Upgrading', () => {
  test('a candidate can upgrade with the test gateway and see the Pro features', async ({ page }) => {
    await register(page, uniqueEmail())

    // ---- Take the free test first, so there is something to analyse ----
    await page.goto('/exams')
    await page.getByRole('link', { name: /SSC CHSL/ }).first().click()
    await page.getByRole('button', { name: 'Start the test' }).click()
    await expect(page).toHaveURL(/\/test\/\d+/, { timeout: 30_000 })
    await page.getByRole('button', { name: 'Submit' }).click()
    await expect(page).toHaveURL(/\/result\/\d+/, { timeout: 30_000 })

    // ---- Upgrade ----
    await chooseTheMonthlyPlan(page)

    // The development gateway takes the money without any money changing
    // hands, and turns the subscription on.
    await page.getByRole('button', { name: 'Pay by card (test)' }).click()
    await expect(page.getByRole('button', { name: 'Pay (test)' })).toBeVisible()
    await page.getByRole('button', { name: 'Pay (test)' }).click()

    await expect(page.getByText('The Pro access is on')).toBeVisible()

    // ---- The subscription is active ----
    await page.goto('/dashboard')
    await expect(page.getByText('Your plan')).toBeVisible()
    await expect(page.getByText('Pro', { exact: true }).first()).toBeVisible()

    // ---- The analytics are available ----
    await page.goto('/analytics')
    await expect(page.getByRole('heading', { name: 'Your trends' })).toBeVisible()
    await expect(page.getByText('Speed over time')).toBeVisible()
    await expect(page.getByText('The keys you are slow on')).toBeVisible()
    await expect(page.getByText('The words you miss most')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'When you type best' })).toBeVisible()
  })

  test('a manual UPI request is approved by an administrator and the Pro access turns on',
    async ({ browser }) => {
      const candidateContext = await browser.newContext()
      const candidatePage = await candidateContext.newPage()
      const email = uniqueEmail('manual')

      await register(candidatePage, email)

      // ---- The candidate raises a manual request ----
      await chooseTheMonthlyPlan(candidatePage)

      await candidatePage.getByRole('button', { name: 'Pay by UPI' }).click()
      await expect(candidatePage.getByLabel('Transaction reference')).toBeVisible()

      await candidatePage.getByLabel('Transaction reference').fill('UPI' + Date.now().toString().slice(-8))
      await candidatePage.getByRole('button', { name: 'Submit reference' }).click()

      await expect(candidatePage.getByText('The reference has been sent')).toBeVisible()

      // ---- The administrator approves it ----
      const adminContext = await browser.newContext()
      const adminPage = await adminContext.newPage()
      await signInAsAdmin(adminPage)

      await adminPage.goto('/admin')
      await adminPage.getByRole('tab', { name: 'Orders' }).click()

      // The row that belongs to this candidate, and only that one.
      const row = adminPage.getByRole('row', { name: new RegExp(email) })
      await expect(row).toBeVisible()
      await row.getByRole('button', { name: 'Approve' }).click()

      await expect(adminPage.getByText('The order is approved')).toBeVisible()

      // ---- The candidate now has Pro access ----
      await candidatePage.goto('/dashboard')
      await expect(candidatePage.getByText('Pro', { exact: true }).first()).toBeVisible({
        timeout: 30_000,
      })

      await candidateContext.close()
      await adminContext.close()
    })
})
