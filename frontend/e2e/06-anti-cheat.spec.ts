import { expect, test } from '@playwright/test'
import { register, uniqueEmail } from './helpers'

/**
 * The anti-cheat measures.
 */
test.describe('The anti-cheat measures', () => {
  test('pasting into the typing area is blocked', async ({ page }) => {
    await register(page, uniqueEmail())

    await page.goto('/exams')
    await page.getByRole('link', { name: /SSC CHSL/ }).first().click()
    await page.getByRole('button', { name: 'Start the test' }).click()
    await expect(page).toHaveURL(/\/test\/\d+/, { timeout: 30_000 })

    const area = page.getByLabel('The text you have typed')
    await area.click()

    // ---- The paste is blocked ----
    await page.evaluate(() => {
      const target = document.querySelector('textarea')
      if (!target) return
      const data = new DataTransfer()
      data.setData('text/plain', 'the quick brown fox jumps over the lazy dog')
      target.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true }))
    })

    // Nothing was pasted.
    await expect(area).toHaveValue('')

    // ---- And the attempt was recorded ----
    await expect(page.getByText('Recorded', { exact: true })).toBeVisible({ timeout: 15_000 })
  })

  test('the context menu is blocked', async ({ page }) => {
    await register(page, uniqueEmail())

    await page.goto('/exams')
    await page.getByRole('link', { name: /SSC CHSL/ }).first().click()
    await page.getByRole('button', { name: 'Start the test' }).click()
    await expect(page).toHaveURL(/\/test\/\d+/, { timeout: 30_000 })

    await page.getByLabel('The text you have typed').click({ button: 'right' })
    await expect(page.getByText('Recorded', { exact: true })).toBeVisible({ timeout: 15_000 })
  })

  test('leaving the tab is recorded', async ({ page }) => {
    await register(page, uniqueEmail())

    await page.goto('/exams')
    await page.getByRole('link', { name: /SSC CHSL/ }).first().click()
    await page.getByRole('button', { name: 'Start the test' }).click()
    await expect(page).toHaveURL(/\/test\/\d+/, { timeout: 30_000 })

    await page.getByLabel('The text you have typed').click()
    await page.evaluate(() => window.dispatchEvent(new Event('blur')))

    await expect(page.getByText('Recorded', { exact: true })).toBeVisible({ timeout: 15_000 })
  })

  test('a flagged test says so on the result', async ({ page }) => {
    await register(page, uniqueEmail())

    await page.goto('/exams')
    await page.getByRole('link', { name: /SSC CHSL/ }).first().click()
    await page.getByRole('button', { name: 'Start the test' }).click()
    await expect(page).toHaveURL(/\/test\/\d+/, { timeout: 30_000 })

    await page.getByLabel('The text you have typed').click()
    await page.evaluate(() => {
      const target = document.querySelector('textarea')
      if (!target) return
      const data = new DataTransfer()
      data.setData('text/plain', 'pasted text')
      target.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true }))
    })

    await page.getByRole('button', { name: 'Submit' }).click()
    await expect(page).toHaveURL(/\/result\/\d+/, { timeout: 30_000 })

    await expect(page.getByText('This test was flagged')).toBeVisible()
  })
})
