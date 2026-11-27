import type { Page } from '@playwright/test'
import { LoginPage, type ContactsPage } from '../pages'
import { expect, test } from '../support/fixtures'
import { SideServiceClient } from '../support/sideService'

const pickTheme = async (
  page: Page,
  contacts: ContactsPage,
  name: string
): Promise<void> => {
  await contacts.themePicker.click()
  await page.getByRole('menuitemradio', { name, exact: true }).click()
}

test.describe('THEME theme picker', () => {
  test('THEME-01 pick each theme', async ({ page, user }) => {
    const contacts = await new LoginPage(page).loginAs(user)
    const html = page.locator('html')
    await expect(html).toHaveAttribute('data-theme', 'light')

    await contacts.themePicker.hover()
    await expect(page.getByRole('tooltip', { name: 'Theme' })).toBeVisible()

    await pickTheme(page, contacts, 'Dark')
    await expect(html).toHaveAttribute('data-theme', 'dark')

    await page.emulateMedia({ colorScheme: 'dark' })
    await pickTheme(page, contacts, 'System')
    await expect(html).toHaveAttribute('data-theme', 'dark')
    await page.emulateMedia({ colorScheme: 'light' })
    await expect(html).toHaveAttribute('data-theme', 'light')

    await pickTheme(page, contacts, 'High contrast')
    await expect(html).toHaveAttribute('data-theme', 'contrast')

    await contacts.themePicker.click()
    await expect(
      page.getByRole('menuitemradio', { name: 'High contrast' })
    ).toHaveAttribute('aria-checked', 'true')
    await page.getByRole('menuitemradio', { name: 'Light' }).click()
    await expect(html).toHaveAttribute('data-theme', 'light')
  })

  test('THEME-02 the account theme applies, the picker is not kept after a reload', async ({
    page,
    user
  }) => {
    const contacts = await new LoginPage(page).loginAs(user)
    const html = page.locator('html')
    await SideServiceClient.of(page).setTheme('dark')

    await contacts.reload()

    await expect(html).toHaveAttribute('data-theme', 'dark')

    // A debug switch: for this page only, nothing is stored
    await pickTheme(page, contacts, 'Light')
    await expect(html).toHaveAttribute('data-theme', 'light')

    await contacts.reload()

    await expect(html).toHaveAttribute('data-theme', 'dark')
    expect(await page.evaluate(() => localStorage.getItem('theme'))).toBe(null)
  })
})
