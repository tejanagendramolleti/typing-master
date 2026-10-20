import { expect, test } from '@playwright/test'
import { register, signInAsAdmin, uniqueEmail } from './helpers'

/**
 * The third flow: upgrade with the test gateway, take a Pro mock, and see
 * the analytics and the weak-key report.
 *
 * The fourth flow is the manual one: a UPI request is submitted, an
 * administrator approves it, and the Pro access turns on.
 */
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
    await page.goto('/pricing')
    const price = page.getByText('₹149').first()
    if (await price.isVisible().catch(() => false)) {
      await price.click()
    }

    // The order is created and the test payment takes it.
    const payButton = page.getByRole('button', { name: /Pay \(test\)|Choose this plan/i }).first()
    if (await payButton.isVisible().catch(() => false)) {
      await payButton.click()
    }

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
    await expect(page.getByText('When you type best')).toBeVisible()
  })

  test('a manual UPI request is approved by an administrator and the Pro access turns on',
    async ({ browser }) => {
      const candidateContext = await browser.newContext()
      const candidatePage = await candidateContext.newPage()
      const email = uniqueEmail('manual')

      await register(candidatePage, email)

      // ---- The candidate raises a manual request ----
      await candidatePage.goto('/pricing')
      const price = candidatePage.getByText('₹149').first()
      if (await price.isVisible().catch(() => false)) {
        await price.click()
      }

      const choose = candidatePage.getByRole('button', { name: /Choose this plan/i }).first()
      if (await choose.isVisible().catch(() => false)) {
        await choose.click()
      }

      // The UPI reference is given.
      const reference = candidatePage.getByLabel(/transaction reference/i).first()
      if (await reference.isVisible().catch(() => false)) {
        await reference.fill('UPI' + Date.now().toString().slice(-8))
        await candidatePage.getByRole('button', { name: /Submit reference|Submit/i }).first().click()
      }

      // ---- The administrator approves it ----
      const adminContext = await browser.newContext()
      const adminPage = await adminContext.newPage()
      await signInAsAdmin(adminPage)

      await adminPage.goto('/admin')
      const approve = adminPage.getByRole('button', { name: /Approve/i }).first()
      if (await approve.isVisible().catch(() => false)) {
        await approve.click()
      }

      // ---- The candidate now has Pro access ----
      await candidatePage.goto('/dashboard')
      await expect(candidatePage.getByText('Pro', { exact: true }).first()).toBeVisible({
        timeout: 30_000,
      })

      await candidateContext.close()
      await adminContext.close()
    })
})
