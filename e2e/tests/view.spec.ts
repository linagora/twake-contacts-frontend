import { ContactFormPage, ContactPage, LoginPage } from '../pages'
import { READ_ONLY } from '../support/dav'
import { expect, test } from '../support/fixtures'
import { popupUrl } from '../support/popups'

const JANE = {
  firstName: 'Jane',
  lastName: 'Doe',
  phones: [{ value: '+33612345678', type: 'work' }],
  emails: ['jane.doe@example.com'],
  matrixId: 'jane',
  addresses: [{ value: '1 rue de Paris', type: 'home' }]
}

test.describe('VIEW contact page', () => {
  test('VIEW-01 contact details', async ({ page, user, dav }) => {
    await dav.createAddressBook({ id: 'qa-book', name: 'QA Book' })
    await dav.putContact('qa-book', JANE)
    const contacts = await new LoginPage(page).loginAs(user)
    await contacts.openBook('QA Book')

    const contact = await contacts.openContact('Jane Doe')

    await expect(contact.backLink).toBeVisible()
    await expect(contact.editButton).toBeVisible()
    await expect(contact.deleteButton).toBeVisible()
    await expect(contact.main.getByText('JD', { exact: true })).toBeVisible()
    await expect(contact.sendEmailButton).toHaveText('Send email')
    await expect(contact.chatButton).toHaveText('Open chat')
    await expect(contact.scheduleButton).toHaveText('Create event')
    // no category: no row with the label icon alone. Each row starts with its
    // kind, read out to screen readers in place of the icon
    await expect(contact.details).toHaveText([
      'Phone+33612345678Work',
      'Emailjane.doe@example.com',
      'Matrix idjane',
      'Address1 rue de ParisHome'
    ])
  })

  test('VIEW-02 copy buttons and toasts', async ({
    page,
    context,
    user,
    dav
  }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await dav.createAddressBook({ id: 'qa-book', name: 'QA Book' })
    await dav.putContact('qa-book', JANE)
    const contacts = await new LoginPage(page).loginAs(user)
    await contacts.openBook('QA Book')
    const contact = await contacts.openContact('Jane Doe')
    const copied = (): Promise<string> =>
      page.evaluate(() => navigator.clipboard.readText())

    await contact.detail('+33612345678').getByRole('button').hover()
    await expect(page.getByRole('tooltip', { name: 'Copy' })).toBeVisible()
    await contact.detail('+33612345678').getByRole('button').click()
    await expect(contacts.toast('Phone number copied')).toBeVisible()
    expect(await copied()).toBe('+33612345678')

    await contact.detail('jane.doe@example.com').getByRole('button').click()
    await expect(contacts.toast('Email address copied')).toBeVisible()
    expect(await copied()).toBe('jane.doe@example.com')

    await contact.detail('jane').getByRole('button').click()
    await expect(contacts.toast('Matrix ID was copied')).toBeVisible()
    expect(await copied()).toBe('jane')

    await expect(
      contact.detail('1 rue de Paris').getByRole('button')
    ).toHaveCount(0)
  })

  test('VIEW-03 Send email, Chat and Schedule open the other apps', async ({
    page,
    user,
    dav
  }) => {
    await dav.createAddressBook({ id: 'qa-book', name: 'QA Book' })
    await dav.putContact('qa-book', JANE)
    await dav.putContact('qa-book', { firstName: 'Name', lastName: 'Only' })
    await dav.putContact('qa-book', {
      firstName: 'Mail',
      lastName: 'Only',
      emails: ['mail.only@example.com']
    })
    const contacts = await new LoginPage(page).loginAs(user)
    await contacts.openBook('QA Book')
    const contact = await contacts.openContact('Jane Doe')

    expect(await popupUrl(page, () => contact.sendEmailButton.click())).toBe(
      'http://mail.e2e.local/mailto/?uri=mailto%3Ajane.doe%40example.com'
    )
    expect(await popupUrl(page, () => contact.chatButton.click())).toBe(
      'http://chat.e2e.local/#/chat/@jane'
    )
    expect(await popupUrl(page, () => contact.scheduleButton.click())).toBe(
      'http://calendar.e2e.local/newEvent?attendee=jane.doe%40example.com'
    )

    await contact.backLink.click()
    await contacts.openContact('Name Only')
    await expect(contact.sendEmailButton).toBeDisabled()
    await expect(contact.chatButton).toBeDisabled()
    await expect(contact.scheduleButton).toBeDisabled()

    await contact.backLink.click()
    await contacts.openContact('Mail Only')
    await expect(contact.sendEmailButton).toBeEnabled()
    await expect(contact.chatButton).toBeDisabled()
    await expect(contact.scheduleButton).toBeEnabled()
  })

  test('VIEW-04 Back returns to the list the contact was opened from', async ({
    page,
    user,
    users,
    dav,
    davFor
  }) => {
    const bob = await users.create({ prefix: 'bob' })
    await davFor(bob).createAddressBook({ id: 'bob-share', name: 'Bob Shared' })
    await davFor(bob).putContact('bob-share', {
      firstName: 'Bobby',
      lastName: 'Sharedone'
    })
    await davFor(bob).share('bob-share', user, READ_ONLY)
    await dav.createAddressBook({ id: 'qa-book', name: 'QA Book' })
    await dav.putContact('qa-book', { firstName: 'Quentin', lastName: 'Book' })
    await dav.putContact('contacts', { firstName: 'Anna', lastName: 'Default' })
    const contacts = await new LoginPage(page).loginAs(user)
    const contact = new ContactPage(page)

    await contacts.openBook('QA Book')
    await contacts.openContact('Quentin Book')
    await contact.backLink.click()
    await expect(page).toHaveURL('/contacts/qa-book')

    await contacts.openMyContacts()
    await contacts.openContact('Anna Default')
    await expect(page).toHaveURL(/\/contacts\/contacts\/[^/]+$/)
    await contact.backLink.click()
    await expect(page).toHaveURL('/contacts')

    await contacts.openContact('Quentin Book')
    await contact.backLink.click()
    await expect(page).toHaveURL('/contacts')

    await contacts.sharedTab.click()
    await contacts.openContact('Bobby Sharedone')
    await contact.backLink.click()
    await expect(page).toHaveURL('/contacts')

    // no list of origin: the contact's own book
    await contacts.openFromSearch('quentin', 'Quentin Book')
    await contact.backLink.click()
    await expect(page).toHaveURL('/contacts/qa-book')
  })

  test('VIEW-05 an unknown contact shows a not-found state', async ({
    page,
    user,
    dav
  }) => {
    await dav.createAddressBook({ id: 'qa-book', name: 'QA Book' })
    const contacts = await new LoginPage(page).loginAs(user)
    const contact = new ContactPage(page)

    for (const path of [
      '/contacts/qa-book/does-not-exist',
      '/contacts/qa-book/does-not-exist/edit'
    ]) {
      await contacts.open(path)
      await expect(contact.notFound).toBeVisible()
      await expect(contact.backLink).toBeVisible()
      await expect(contact.editButton).toHaveCount(0)
      await expect(contact.deleteButton).toHaveCount(0)
    }
  })

  test('VIEW-06 a structured address and categories', async ({
    page,
    user,
    dav
  }) => {
    await dav.createAddressBook({ id: 'qa-book', name: 'QA Book' })
    const response = await dav.request(
      'PUT',
      `/addressbooks/${user.id}/qa-book/qa-imp-1.vcf`,
      {
        contentType: 'text/vcard',
        body:
          'BEGIN:VCARD\r\nVERSION:3.0\r\nUID:qa-imp-1\r\nFN:Imported Alpha\r\nN:Alpha;Imported;;;\r\n' +
          'EMAIL;TYPE=WORK:imported.alpha@example.com\r\nTEL;TYPE=CELL:+33600000001\r\n' +
          'CATEGORIES:Sales,Paris\r\nADR;TYPE=WORK:;Building B;10 Avenue des Champs;Paris;;75008;France\r\n' +
          'ORG:Acme\r\nEND:VCARD\r\n'
      }
    )
    expect(response.status).toBe(201)
    const contacts = await new LoginPage(page).loginAs(user)
    await contacts.openBook('QA Book')
    await expect(
      contacts.row('Imported Alpha').getByRole('cell').nth(3)
    ).toHaveText('SalesParis')

    const contact = await contacts.openContact('Imported Alpha')

    await expect(
      contact.detail('Building B, 10 Avenue des Champs, 75008 Paris, France')
    ).toContainText('Work')
    await expect(contact.detail('Sales')).toContainText('Paris')
    await expect(contact.detail('+33600000001')).toContainText('Mobile')
  })

  test('VIEW-08 a contact beyond the first loaded page opens by its URL', async ({
    page,
    user,
    dav
  }) => {
    for (let i = 1; i <= 60; i++) {
      const n = String(i).padStart(3, '0')
      await dav.putContact('contacts', {
        uid: `qa-bulk-${n}`,
        firstName: 'Bulk',
        lastName: n,
        emails: [`bulk${n}@example.com`]
      })
    }
    const contacts = await new LoginPage(page).loginAs(user)
    const contact = new ContactPage(page)

    await contacts.open('/contacts/contacts/qa-bulk-060')
    await expect(contact.name).toHaveText('Bulk 060')
    await expect(contact.detail('bulk060@example.com')).toBeVisible()

    await contacts.open('/contacts/contacts/qa-bulk-060/edit')
    const form = new ContactFormPage(page)
    await expect(form.lastName).toHaveValue('060')
    await form.lastName.fill('Sixty')
    await form.saveEdit('Bulk Sixty')

    await contacts.open('/contacts/contacts/does-not-exist')
    await expect(contact.notFound).toBeVisible()
  })

  test('VIEW-10 a contact stored as new.vcf opens its contact page', async ({
    page,
    user,
    dav
  }) => {
    await dav.createAddressBook({ id: 'qa-book', name: 'QA Book' })
    await dav.putContact('qa-book', {
      uid: 'new',
      firstName: 'Newton',
      lastName: 'Card'
    })
    const contacts = await new LoginPage(page).loginAs(user)
    await contacts.openBook('QA Book')

    const contact = await contacts.openContact('Newton Card')
    await expect(page).toHaveURL('/contacts/qa-book/new')
    await expect(contact.name).toHaveText('Newton Card')

    // A direct link too, and not the creation form
    await contacts.open('/contacts/qa-book/new')
    await expect(contact.name).toHaveText('Newton Card')
    await expect(contact.editButton).toBeVisible()
    await expect(new ContactFormPage(page).firstName).toHaveCount(0)
  })

  test('VIEW-11 addresses of other clients are shown without stray separators', async ({
    page,
    user,
    dav
  }) => {
    await dav.createAddressBook({ id: 'qa-book', name: 'QA Book' })
    await dav.putJCard('qa-book', 'qa-adr', [
      ['fn', {}, 'text', 'Odd Address'],
      ['n', {}, 'text', ['Address', 'Odd', '', '', '']],
      // Blank components around a locality
      [
        'adr',
        { type: 'work' },
        'text',
        [' ', ' ', '2 Side Road', 'Paris', ' ', ' ', ' ']
      ],
      // A street of several lines (a component that is an array, RFC 7095 3.3.1.3)
      [
        'adr',
        {},
        'text',
        ['', '', ['3 Long Lane', 'Floor 4'], 'Lyon', '', '69001', '']
      ]
    ])
    const contacts = await new LoginPage(page).loginAs(user)
    await contacts.openBook('QA Book')
    const contact = await contacts.openContact('Odd Address')

    await expect(contact.detail('2 Side Road, Paris')).toContainText('Work')
    await expect(
      contact.detail('3 Long Lane Floor 4, 69001 Lyon')
    ).toBeVisible()
  })

  test('VIEW-12 initials of names starting with an emoji or a punctuation mark', async ({
    page,
    user,
    dav
  }) => {
    await dav.createAddressBook({ id: 'qa-book', name: 'QA Book' })
    await dav.putContact('qa-book', { firstName: '🦊', lastName: 'Fox' })
    await dav.putContact('qa-book', { firstName: '(Jane)', lastName: 'Doe' })
    const contacts = await new LoginPage(page).loginAs(user)
    await contacts.openBook('QA Book')

    let contact = await contacts.openContact('🦊 Fox')
    await expect(contact.main.getByText('🦊F', { exact: true })).toBeVisible()

    await contact.backLink.click()
    contact = await contacts.openContact('(Jane) Doe')
    await expect(contact.main.getByText('JD', { exact: true })).toBeVisible()
  })
})
