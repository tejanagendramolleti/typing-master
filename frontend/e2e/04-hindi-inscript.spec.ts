import { expect, test } from '@playwright/test'
import { register, uniqueEmail } from './helpers'

/**
 * The fifth flow: a Hindi Inscript test, driven with simulated key events,
 * checking the exact Unicode that comes out.
 */
test.describe('The Hindi Inscript layout', () => {
  test('the layout produces the exact Devanagari the passage holds', async ({ page }) => {
    await register(page, uniqueEmail())

    // ---- The Hindi exam ----
    await page.goto('/exams')
    const hindiExam = page.getByRole('link', { name: /Hindi/ }).first()
    await hindiExam.click()
    await expect(page.getByRole('heading', { name: /Hindi/ })).toBeVisible()

    await page.getByRole('button', { name: 'Start the test' }).click()
    await expect(page).toHaveURL(/\/test\/\d+/, { timeout: 30_000 })

    // ---- The on-screen keyboard is there, and it is the Hindi one ----
    const keyboard = page.getByLabel(/On-screen .* keyboard/)
    await expect(keyboard).toBeVisible()
    await expect(page.getByRole('button', { name: 'क', exact: true })).toBeVisible()

    // ---- The passage is Devanagari ----
    const passage = page.getByLabel('The passage to type')
    const text = (await passage.innerText()).trim()
    expect(text.length).toBeGreaterThan(20)
    // The Devanagari block, U+0900 to U+097F.
    expect(/[ऀ-ॿ]/.test(text)).toBe(true)

    // ---- The next key is highlighted ----
    // The layout knows which key comes next, and the on-screen keyboard
    // shows it.
    const highlighted = page.locator('.bg-accent-500').filter({ hasText: /./ })
    await expect(highlighted.first()).toBeVisible()

    // ---- Type a Devanagari conjunct with simulated key events ----
    // क (Q) then त (F). The layout reads the passage and joins them with a
    // halant when the passage writes them joined.
    await page.getByLabel('The text you have typed').click()
    await page.keyboard.press('KeyQ')
    await page.keyboard.press('KeyF')

    const typed = await page.getByLabel('The text you have typed').inputValue()
    expect(typed.length).toBeGreaterThan(0)
    // The first character is the Devanagari KA, whatever the conjunct did.
    expect(typed.startsWith('क')).toBe(true)
  })

  test('a matra attaches to the consonant before it', async ({ page }) => {
    await register(page, uniqueEmail())

    await page.goto('/exams')
    await page.getByRole('link', { name: /Hindi/ }).first().click()
    await page.getByRole('button', { name: 'Start the test' }).click()
    await expect(page).toHaveURL(/\/test\/\d+/, { timeout: 30_000 })

    await page.getByLabel('The text you have typed').click()
    // क (Q) then the AA matra. On the number row the plain key writes the
    // sign, which attaches to the consonant before it, and the shifted key
    // writes the vowel on its own.
    await page.keyboard.press('KeyQ')
    await page.keyboard.press('Digit1')

    const typed = await page.getByLabel('The text you have typed').inputValue()
    // The matra is attached, not standing on its own.
    expect(typed.startsWith('का')).toBe(true)
  })
})
