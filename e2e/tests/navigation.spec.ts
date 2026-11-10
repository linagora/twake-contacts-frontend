import { ContactFormPage, ContactPage, LoginPage } from '../pages'
import { READ_ONLY, READ_WRITE } from '../support/dav'
import { expect, test } from '../support/fixtures'

test.describe('NAV sidebar and navigation', () => {
  test('NAV-01 the sidebar lists the own books in natural order, without the hidden ones', async ({
    page,
    user,
    dav
  }) => {
    await dav.createAddressBook({ id: 'qa-z', name: 'Zeta' })
    await dav.createAddressBook({ id: 'qa-a', name: 'alpha' })
    await dav.createAddressBook({ id: 'qa-10', name: 'Book 10' })
    await dav.createAddressBook({ id: 'qa-2', name: 'Book 2' })

    const contacts = await new LoginPage(page).loginAs(user)

    const entries = contacts.entries
    await expect(entries).toHaveText([
      /^My contacts/,
      'alpha',
      'Book 2',
      'Book 10',
      'Zeta',
      'Shared'
    ])
    await expect(contacts.myContactsChevron).toBeVisible()
    await expect(contacts.newAddressBookButton).toBeVisible()
    // the default and the collected books have no entry
    await expect(contacts.nav.getByText('collected')).toHaveCount(0)
    await expect(
      contacts.nav.getByText('contacts', { exact: true })
    ).toHaveCount(0)
  })

  test('NAV-02 selecting an address book and going back to My contacts', async ({
    page,
    user,
    dav
  }) => {
    await dav.createAddressBook({ id: 'qa-book', name: 'QA Book' })
    await dav.putContact('qa-book', { firstName: 'Quentin', lastName: 'Book' })
    await dav.putContact('contacts', { firstName: 'Anna', lastName: 'Default' })
    const contacts = await new LoginPage(page).loginAs(user)

    await contacts.openBook('QA Book')

    await expect(page).toHaveURL('/contacts/qa-book')
    await expect(contacts.book('QA Book')).toHaveAttribute(
      'aria-current',
      'page'
    )
    await expect(contacts.row('Quentin Book')).toBeVisible()
    await expect(contacts.row('Anna Default')).toHaveCount(0)

    await contacts.openMyContacts()

    await expect(page).toHaveURL('/contacts')
    await expect(contacts.myContacts).toHaveAttribute('aria-current', 'page')
    await expect(contacts.heading).toHaveText('My contacts')
  })

  test('NAV-03 the Create button targets the selected writable book', async ({
    page,
    user,
    users,
    dav,
    davFor
  }) => {
    const bob = await users.create({ prefix: 'bob' })
    await davFor(bob).createAddressBook({ id: 'bob-ro', name: 'Bob Read Only' })
    await davFor(bob).share('bob-ro', user, READ_ONLY)
    await dav.createAddressBook({ id: 'qa-book', name: 'QA Book' })
    const contacts = await new LoginPage(page).loginAs(user)
    const form = new ContactFormPage(page)

    await contacts.clickCreate()
    await expect(page).toHaveURL('/contacts/new')
    await expect(form.addressBook).toHaveText('My contacts')

    await contacts.openBook('QA Book')
    await contacts.clickCreate()
    await expect(page).toHaveURL('/contacts/new/qa-book')
    await expect(form.addressBook).toHaveText('QA Book')

    // a read-only shared book falls back to the default book
    await contacts.openBook('Bob Read Only')
    await contacts.clickCreate()
    await expect(page).toHaveURL('/contacts/new')
    await expect(form.addressBook).toHaveText('My contacts')
  })

  test('NAV-05 browser history and reload keep the screen', async ({
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
    const contact = await contacts.openContact('Jane Doe')
    const contactUrl = page.url()

    await page.goBack()
    await expect(page).toHaveURL('/contacts/qa-book')
    await expect(contacts.heading).toHaveText('QA Book')
    await page.goBack()
    await expect(page).toHaveURL('/contacts')
    await expect(contacts.heading).toHaveText('My contacts')
    await page.goForward()
    await expect(contacts.heading).toHaveText('QA Book')
    await page.goForward()
    await expect(page).toHaveURL(contactUrl)
    await expect(contact.name).toHaveText('Jane Doe')

    await contacts.reload()
    await expect(contact.name).toHaveText('Jane Doe')
    await expect(contact.notFound).toHaveCount(0)
  })

  test('NAV-06 an unknown address book shows a not-found state', async ({
    page,
    user
  }) => {
    const contacts = await new LoginPage(page).loginAs(user)

    await contacts.open('/contacts/no-such-book')

    await expect(contacts.addressBookNotFound).toBeVisible()
    await expect(contacts.backLink).toBeVisible()
    // the not-found message is the page h1
    await expect(contacts.heading).toHaveText('Address book not found')
    await expect(contacts.emptyState).toHaveCount(0)
    await expect(contacts.importButton).toHaveCount(0)
    await expect(contacts.table).toHaveCount(0)
    await expect(contacts.currentEntries()).toHaveCount(0)

    await contacts.backLink.click()
    await expect(page).toHaveURL('/contacts')
    await expect(contacts.heading).toHaveText('My contacts')
  })

  test('NAV-07 My contacts has no chevron without own books', async ({
    page,
    user
  }) => {
    const contacts = await new LoginPage(page).loginAs(user)

    await expect(contacts.myContacts).toBeVisible()
    await expect(contacts.myContactsChevron).toHaveCount(0)
    await expect(contacts.newAddressBookButton).toBeVisible()
  })

  test('NAV-07 collapse and expand the books under My contacts', async ({
    page,
    user,
    dav
  }) => {
    await dav.createAddressBook({ id: 'qa-book', name: 'QA Book' })
    const contacts = await new LoginPage(page).loginAs(user)
    await contacts.openBook('QA Book')

    await expect(contacts.myContactsChevron).toHaveAccessibleName('Collapse')
    await expect(contacts.myContacts).not.toHaveAttribute('aria-expanded')
    await expect(contacts.myContacts.getByRole('button')).toHaveCount(0)

    await contacts.myContactsChevron.click()
    await expect(contacts.myContactsChevron).toHaveAttribute(
      'aria-expanded',
      'false'
    )
    await expect(contacts.book('QA Book')).toBeHidden()
    await expect(contacts.newAddressBookButton).toBeVisible()

    await contacts.myContactsChevron.click()
    await expect(contacts.myContactsChevron).toHaveAttribute(
      'aria-expanded',
      'true'
    )
    await expect(contacts.book('QA Book')).toBeVisible()

    await contacts.myContacts.click()
    await expect(page).toHaveURL('/contacts')
    await expect(contacts.myContacts).toHaveAttribute('aria-current', 'page')
  })

  test('NAV-08 a shared book is listed under Shared with its owner name', async ({
    page,
    user,
    users,
    davFor
  }) => {
    const owner = await users.create({ prefix: 'bob' })
    await davFor(owner).createAddressBook({ id: 'qa-book', name: 'QA Book' })
    await davFor(owner).share('qa-book', user, READ_ONLY)

    const contacts = await new LoginPage(page).loginAs(user)

    const entries = contacts.entries
    await expect(entries).toHaveText([/^My contacts/, 'Shared', /^QA Book/])
    await expect(contacts.bookEntry('QA Book')).toContainText(owner.displayName)
    await contacts.book('QA Book').hover()
    await expect(page.getByRole('tooltip', { name: 'QA Book' })).toBeVisible()
  })

  test('NAV-08 an own book has no owner line', async ({ page, user, dav }) => {
    await dav.createAddressBook({ id: 'qa-book', name: 'QA Book' })

    const contacts = await new LoginPage(page).loginAs(user)

    await expect(contacts.bookEntry('QA Book')).toHaveText('QA Book')
  })

  test('NAV-10 the Shared section sorts the books of other users and folds', async ({
    page,
    user,
    users,
    dav,
    davFor
  }) => {
    const bob = await users.create({ prefix: 'bob' })
    const carol = await users.create({ prefix: 'carol' })
    await davFor(bob).createAddressBook({ id: 'bob-z', name: 'Zulu Shared' })
    await davFor(bob).createAddressBook({ id: 'bob-a', name: 'Alpha Shared' })
    await davFor(bob).share('bob-z', user, READ_ONLY)
    await davFor(bob).share('bob-a', user, READ_WRITE)
    await davFor(carol).createAddressBook({ id: 'carol-m', name: 'Mid Carol' })
    await davFor(carol).share('carol-m', user, READ_ONLY)
    await dav.createAddressBook({ id: 'qa-book', name: 'QA Book' })

    const contacts = await new LoginPage(page).loginAs(user)

    const entries = contacts.entries
    await expect(entries).toHaveText([
      /^My contacts/,
      'QA Book',
      'Shared',
      `Alpha Shared${bob.displayName}`,
      `Mid Carol${carol.displayName}`,
      `Zulu Shared${bob.displayName}`
    ])

    const sharedToggle = contacts.nav.getByRole('button', {
      name: 'Shared',
      exact: true
    })
    await expect(sharedToggle).toHaveAttribute('aria-expanded', 'true')
    await sharedToggle.focus()
    await page.keyboard.press('Enter')
    await expect(sharedToggle).toHaveAttribute('aria-expanded', 'false')
    await expect(contacts.book('Alpha Shared')).toBeHidden()
    await page.keyboard.press(' ')
    await expect(sharedToggle).toHaveAttribute('aria-expanded', 'true')
    await expect(contacts.book('Alpha Shared')).toBeVisible()

    await contacts.sharedCaption.click()
    await expect(contacts.book('Alpha Shared')).toBeHidden()
    await expect(page).toHaveURL('/contacts')
    await contacts.sharedCaption.click()
    await expect(contacts.book('Alpha Shared')).toBeVisible()

    // the "+" opens its dialog, it does not fold the section
    const dialog = await contacts.openAddSharedBookDialog()
    await dialog.cancelButton.click()
    await expect(contacts.book('Alpha Shared')).toBeVisible()

    await contacts.openBook('Alpha Shared')
    await expect(page).toHaveURL(/\/contacts\/[0-9a-f-]{36}$/)
    await expect(contacts.currentEntries()).toHaveCount(1)
    await expect(contacts.book('Alpha Shared')).toHaveAttribute(
      'aria-current',
      'page'
    )
  })

  test('NAV-11 exactly one sidebar entry is the current page', async ({
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
    const contacts = await new LoginPage(page).loginAs(user)

    await expect(contacts.currentEntries()).toHaveCount(1)
    await expect(contacts.myContacts).toHaveAttribute('aria-current', 'page')

    await contacts.openBook('QA Book')
    await expect(contacts.currentEntries()).toHaveCount(1)
    await expect(contacts.book('QA Book')).toHaveAttribute(
      'aria-current',
      'page'
    )

    await contacts.openBook('Bob Book')
    await expect(contacts.currentEntries()).toHaveCount(1)
    await expect(contacts.book('Bob Book')).toHaveAttribute(
      'aria-current',
      'page'
    )

    await contacts.openMyContacts()
    await expect(contacts.currentEntries()).toHaveCount(1)
    await expect(contacts.myContacts).toHaveAttribute('aria-current', 'page')
  })

  test('NAV-13 an address book with an empty name is labelled with its id', async ({
    page,
    user,
    dav
  }) => {
    await dav.createAddressBook({ id: 'qa-empty', name: '' })
    await dav.putContact('qa-empty', {
      firstName: 'Nameless',
      lastName: 'Book'
    })
    const contacts = await new LoginPage(page).loginAs(user)

    await expect(contacts.book('qa-empty')).toBeVisible()
    await contacts.openBook('qa-empty')
    await expect(contacts.row('Nameless Book')).toBeVisible()

    const form = await contacts.clickCreate()
    await expect(form.addressBook).toHaveText('qa-empty')
    await expect(page).toHaveURL('/contacts/new/qa-empty')
    await new ContactPage(page).backLink.click()
    await expect(page).toHaveURL('/contacts/qa-empty')
  })

  test('NAV-14 address book ids named like JavaScript object members', async ({
    page,
    user,
    dav
  }) => {
    await dav.createAddressBook({ id: 'constructor', name: 'Builders' })
    await dav.putContact('constructor', {
      firstName: 'Bob',
      lastName: 'Builder'
    })
    const contacts = await new LoginPage(page).loginAs(user)

    await contacts.openBook('Builders')
    await expect(page).toHaveURL('/contacts/constructor')
    await expect(contacts.heading).toHaveText('Builders')
    await expect(contacts.row('Bob Builder')).toBeVisible()

    // No such book: the not-found state, not a crash (the fixture fails on page errors)
    await contacts.open('/contacts/toString')
    await expect(contacts.addressBookNotFound).toBeVisible()
  })
})
