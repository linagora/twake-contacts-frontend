import { LoginPage } from '../pages'
import { expect, test } from '../support/fixtures'
import { SideServiceClient } from '../support/sideService'

test.describe('THEME dark mode', () => {
  test('THEME-01 toggle dark mode and back', async ({ page, user }) => {
    const contacts = await new LoginPage(page).loginAs(user)
    const html = page.locator('html')
    await expect(html).toHaveAttribute('data-theme', 'light')

    await contacts.themeToggle.hover()
    await expect(page.getByRole('tooltip', { name: 'Dark mode' })).toBeVisible()
    await contacts.themeToggle.click()

    await expect(html).toHaveAttribute('data-theme', 'dark')
    await expect(contacts.themeToggle).toHaveAccessibleName('Light mode')

    await contacts.themeToggle.click()
    await expect(html).toHaveAttribute('data-theme', 'light')
    await expect(contacts.themeToggle).toHaveAccessibleName('Dark mode')
  })

  test('THEME-02 the account theme applies, the toggle is not kept after a reload', async ({
    page,
    user
  }) => {
    const contacts = await new LoginPage(page).loginAs(user)
    const html = page.locator('html')
    await SideServiceClient.of(page).setTheme('dark')

    await contacts.reload()

    await expect(html).toHaveAttribute('data-theme', 'dark')
    await expect(contacts.themeToggle).toHaveAccessibleName('Light mode')

    // A debug switch: for this page only, nothing is stored
    await contacts.themeToggle.click()
    await expect(html).toHaveAttribute('data-theme', 'light')

    await contacts.reload()

    await expect(html).toHaveAttribute('data-theme', 'dark')
    expect(await page.evaluate(() => localStorage.getItem('theme'))).toBe(null)
  })
})
