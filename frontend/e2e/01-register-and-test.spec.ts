import { expect, test } from '@playwright/test'
import { register, typePassage, uniqueEmail } from './helpers'

/**
 * The first flow: register, sign in, take a free English test and see the
 * result.
 */
test.describe('Registering and taking a test', () => {
  test('a new candidate can register, take an English test and see the result', async ({ page }) => {
    await register(page, uniqueEmail())

    // ---- The catalogue ----
    await page.goto('/exams')
    await expect(page.getByRole('heading', { name: 'Every exam we have a profile for' })).toBeVisible()

    // ---- Start the SSC CHSL test ----
    await page.getByRole('link', { name: /SSC CHSL/ }).first().click()
    await expect(page.getByRole('heading', { name: 'SSC CHSL' })).toBeVisible()

    await page.getByRole('button', { name: 'Start the test' }).click()
    await expect(page).toHaveURL(/\/test\/\d+/, { timeout: 30_000 })

    // ---- The passage is there ----
    const passage = page.getByLabel('The passage to type')
    await expect(passage).toBeVisible()

    const text = (await passage.innerText()).trim()
    expect(text.length).toBeGreaterThan(20)

    // ---- Type the first few words and submit ----
    const snippet = text.split(' ').slice(0, 8).join(' ')
    await typePassage(page, snippet)

    await page.getByRole('button', { name: 'Submit' }).click()

    // ---- The result ----
    await expect(page).toHaveURL(/\/result\/\d+/, { timeout: 30_000 })
    await expect(page.getByText('Net speed')).toBeVisible()
    await expect(page.getByText('Accuracy')).toBeVisible()
    await expect(page.getByText('Word by word')).toBeVisible()
  })

  test('the free allowance is counted on the server', async ({ page }) => {
    await register(page, uniqueEmail())

    await page.goto('/dashboard')
    await expect(page.getByText('Tests used today')).toBeVisible()
    await expect(page.getByText('of 3')).toBeVisible()
  })
})
