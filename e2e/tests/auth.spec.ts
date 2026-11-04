import { ContactPage, ContactsPage, LoginPage } from '../pages'
import { expect, test } from '../support/fixtures'

test.describe('AUTH login and application shell', () => {
  test('AUTH-01 login through SSO lands on My contacts', async ({
    page,
    user
  }) => {
    const contacts = await new LoginPage(page).loginAs(user)

    await expect(page).toHaveURL('/contacts')
    await expect(contacts.createLink).toBeVisible()
    await expect(contacts.myContacts).toHaveAttribute('aria-current', 'page')
    await expect(contacts.searchBox).toBeVisible()
    await expect(contacts.heading).toHaveText('My contacts')
    await expect(contacts.toast(/./)).toHaveCount(0)
  })

  test('AUTH-02 a deep link while logged out comes back after the login', async ({
    page,
    user
  }) => {
    const login = new LoginPage(page)
    await page.goto('/contacts/new')
    await expect(login.emailInput).toBeVisible()
    await login.submit(user)

    await expect(page).toHaveURL('/contacts/new')
    await expect(
      page.getByRole('textbox', { name: 'First name' })
    ).toBeVisible()
  })

  test('AUTH-04 the error page without an error goes back to the contacts', async ({
    page,
    user
  }) => {
    const contacts = await new LoginPage(page).loginAs(user)

    await contacts.open('/error')

    await expect(page).toHaveURL('/contacts')
    await expect(contacts.heading).toHaveText('My contacts')
  })

  test('AUTH-05 a reload keeps the user signed in on the same page, tokens not in web storage', async ({
    page,
    user,
    dav
  }) => {
    await dav.createAddressBook({ id: 'qa-book', name: 'QA Book' })
    await dav.putContact('qa-book', {
      firstName: 'Jane',
      lastName: 'Doe',
      emails: ['jane.doe@example.com']
    })
    const contacts = await new LoginPage(page).loginAs(user)
    await contacts.openBook('QA Book')
    await contacts.openContact('Jane Doe')
    await expect(page).toHaveURL(/\/contacts\/qa-book\/[^/]+$/)

    await contacts.reload()

    const contact = new ContactPage(page)
    await expect(contact.name).toHaveText('Jane Doe')
    await expect(contact.detail('jane.doe@example.com')).toBeVisible()
    const storage = await page.evaluate(() => ({
      tokenSet: sessionStorage.getItem('tokenSet'),
      userData: sessionStorage.getItem('userData'),
      session: Object.values(sessionStorage).join('\n'),
      local: Object.values(localStorage).join('\n')
    }))
    expect(storage.tokenSet).toBeNull()
    expect(storage.userData).toBeNull()
    // an access token is a JWT: three base64url parts
    expect(storage.session).not.toMatch(/eyJ[\w-]+\.[\w-]+\.[\w-]+/)
    expect(storage.local).not.toMatch(/eyJ[\w-]+\.[\w-]+\.[\w-]+/)
  })

  test('AUTH-05 the SSO callback with no sign-in pending goes to the contacts', async ({
    page,
    user
  }) => {
    const contacts = await new LoginPage(page).loginAs(user)

    await page.goto('/callback')

    await expect(page).toHaveURL('/contacts')
    await new ContactsPage(page).expectLoaded()
    await expect(contacts.heading).toHaveText('My contacts')
  })
})
