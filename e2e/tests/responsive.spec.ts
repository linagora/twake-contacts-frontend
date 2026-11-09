import { LoginPage } from '../pages'
import { READ_ONLY } from '../support/dav'
import { expect, test } from '../support/fixtures'

// Run by the `mobile` project only (390 × 844, playwright.config.ts)
test.describe('RESP phone layout', () => {
  test('RESP-01 phone layout of the contact list', async ({
    page,
    user,
    dav
  }) => {
    await dav.createAddressBook({ id: 'qa-book', name: 'QA Book' })
    await dav.createAddressBook({ id: 'empty', name: 'Empty Book' })
    await dav.putContact('qa-book', {
      firstName: 'Quentin',
      lastName: 'Book',
      emails: ['quentin@example.com']
    })
    await dav.putContact('contacts', { firstName: 'Anna', lastName: 'Default' })
    await new LoginPage(page).loginAs(user)
    const menu = page.getByRole('button', { name: 'Menu' })
    const create = page.getByRole('link', { name: 'Create' })
    const main = page.getByRole('main').last()

    await expect(menu).toBeVisible()
    await expect(page.getByText('Mobile version coming soon')).toHaveCount(0)
    await expect(
      page.getByRole('combobox', { name: 'Search contacts...' })
    ).toBeVisible()
    await expect(main.getByRole('tab', { name: 'My contacts' })).toBeVisible()
    await expect(main.getByRole('heading', { level: 4 })).toHaveCount(0)
    // only the name and the actions
    await expect(main.getByRole('columnheader')).toHaveText([/^Name/, ''])
    await expect(create).toHaveAttribute('href', '/contacts/new')
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth
    )
    expect(overflow).toBe(false)

    await menu.click()
    await page
      .getByRole('navigation')
      .getByRole('button', { name: 'QA Book' })
      .click()
    await expect(page).toHaveURL('/contacts/qa-book')
    await expect(create).toHaveAttribute('href', '/contacts/new/qa-book')
    await expect(main.getByRole('tab')).toHaveCount(0)

    await menu.click()
    await page
      .getByRole('navigation')
      .getByRole('button', { name: 'Empty Book' })
      .click()
    await expect(main.getByText('No contacts yet')).toBeVisible()
    await expect(main.getByRole('button', { name: 'Import' })).toBeVisible()
  })

  test('RESP-02 the sidebar is a drawer', async ({
    page,
    user,
    users,
    dav,
    davFor
  }) => {
    const bob = await users.create({ prefix: 'bob' })
    await davFor(bob).createAddressBook({ id: 'bob-book', name: 'Bob Book' })
    await davFor(bob).share('bob-book', user, READ_ONLY)
    await dav.createAddressBook({ id: 'qa-book', name: 'QA Book' })
    await new LoginPage(page).loginAs(user)
    // a dialog holding the navigation of the sidebar
    const drawer = page.getByRole('dialog')

    await page.getByRole('button', { name: 'Menu' }).click()
    await expect(drawer.getByRole('button', { name: 'QA Book' })).toBeVisible()
    await expect(
      drawer.getByRole('button', { name: /^Bob Book/ })
    ).toContainText(bob.displayName)
    await expect(drawer.getByRole('link', { name: 'Create' })).toHaveCount(0)

    await drawer.getByRole('button', { name: 'New address book' }).click()
    const dialog = page
      .getByRole('dialog')
      .filter({ hasText: 'New address book' })
    await expect(dialog).toBeVisible()
    await expect(drawer.getByRole('button', { name: 'QA Book' })).toBeHidden()
    await dialog.getByRole('button', { name: 'Cancel' }).click()

    await page.getByRole('button', { name: 'Menu' }).click()
    await drawer.getByRole('button', { name: 'QA Book' }).click()
    await expect(page).toHaveURL('/contacts/qa-book')
    await expect(drawer.getByRole('button', { name: 'QA Book' })).toBeHidden()
  })
})
