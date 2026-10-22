import { expect, test } from '@playwright/test'
import { register, uniqueEmail } from './helpers'

/**
 * The third flow: the pricing page and the free tier.
 *
 * The checkout itself arrives with the billing front end, in the phase
 * after this one. There is nothing to upgrade to yet, so this flow checks
 * what there is: the plans are on the page with their prices and their
 * terms, and a free candidate is told what the allowance is.
 */
test.describe('The pricing page and the free tier', () => {
  test('the plans are on the page with their prices and their terms', async ({ page }) => {
    await page.goto('/pricing')

    await expect(page.getByRole('heading', { name: 'One plan, three terms' })).toBeVisible()

    // ---- The three paid plans ----
    await expect(page.getByRole('heading', { name: 'Pro Monthly' })).toBeVisible()
    await expect(page.getByText('₹149')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Pro Quarterly' })).toBeVisible()
    await expect(page.getByText('₹399')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Pro Yearly' })).toBeVisible()
    await expect(page.getByText('₹1299')).toBeVisible()

    // ---- And how long each one runs for ----
    await expect(page.getByText('a month', { exact: true })).toBeVisible()
    await expect(page.getByText('a quarter', { exact: true })).toBeVisible()
    await expect(page.getByText('a year', { exact: true })).toBeVisible()
  })

  test('a free candidate is told what the allowance is', async ({ page }) => {
    await register(page, uniqueEmail())

    await page.goto('/dashboard')
    await expect(page.getByText('Your plan')).toBeVisible()
    await expect(page.getByText('Free', { exact: true })).toBeVisible()
  })
})
