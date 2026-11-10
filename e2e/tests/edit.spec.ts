import { ContactPage, LoginPage } from '../pages'
import { READ_WRITE } from '../support/dav'
import { expect, test } from '../support/fixtures'

const JANE = {
  firstName: 'Jane',
  lastName: 'Doe',
  phones: [{ value: '+33612345678', type: 'work' }],
  emails: ['jane.doe@example.com'],
  matrixId: 'jane',
  addresses: [{ value: '1 rue de Paris', type: 'home' }]
}

test.describe('EDIT edit contact', () => {
  test('EDIT-01 edit a contact', async ({ page, user, dav }) => {
    await dav.createAddressBook({ id: 'qa-book', name: 'QA Book' })
    const jane = await dav.putContact('qa-book', JANE)
    const contacts = await new LoginPage(page).loginAs(user)
    await contacts.openBook('QA Book')
    const contact = await contacts.openContact('Jane Doe')

    const form = await contact.edit()
    await expect(page).toHaveURL(`/contacts/qa-book/${jane}/edit`)
    await expect(form.title).toHaveText('Jane Doe')
    await expect(form.firstName).toHaveValue('Jane')
    await expect(form.lastName).toHaveValue('Doe')
    await expect(form.phones).toHaveValue('+33612345678')
    await expect(form.emails).toHaveValue('jane.doe@example.com')
    await expect(form.matrixId).toHaveValue('jane')
    await expect(form.addresses).toHaveValue('1 rue de Paris')
    await expect(form.typeSelectors).toHaveText(['Work', 'Home'])

    await form.lastName.fill('Smith')
    await form.phones.fill('+33699999999')
    await form.saveEdit('Jane Smith')

    await expect(contact.detail('+33699999999')).toBeVisible()
    await expect(contact.detail('1 rue de Paris')).toContainText('Home')
    await expect.poll(() => dav.contactNames('qa-book')).toEqual(['Jane Smith'])
    await contacts.reload()
    await expect(contact.name).toHaveText('Jane Smith')
    await contact.backLink.click()
    await expect(contacts.row('Jane Smith')).toBeVisible()
  })

  test('EDIT-02 the form needs a name, Back leaves without saving', async ({
    page,
    user,
    dav
  }) => {
    await dav.createAddressBook({ id: 'qa-book', name: 'QA Book' })
    await dav.createAddressBook({ id: 'other', name: 'Other Book' })
    await dav.putContact('qa-book', JANE)
    const contacts = await new LoginPage(page).loginAs(user)
    await contacts.openBook('QA Book')
    const contact = await contacts.openContact('Jane Doe')

    const form = await contact.edit()
    await expect(form.addressBook).toBeEnabled()
    await expect(form.addressBook).toHaveText('QA Book')
    await form.fill({ firstName: '', lastName: '' })
    await expect(form.saveButton).toBeDisabled()
    await form.chooseAddressBook('Other Book')
    await form.backLink.click()

    await expect(contact.name).toHaveText('Jane Doe')
    await expect(page).toHaveURL(/\/contacts\/qa-book\/[^/]+$/)
    expect(await dav.contactNames('qa-book')).toEqual(['Jane Doe'])
    expect(await dav.contactNames('other')).toEqual([])
  })

  test('EDIT-03 delete from the edit form', async ({ page, user, dav }) => {
    await dav.createAddressBook({ id: 'qa-book', name: 'QA Book' })
    const jane = await dav.putContact('qa-book', JANE)
    const contacts = await new LoginPage(page).loginAs(user)
    await contacts.openBook('QA Book')
    const form = await (await contacts.openContact('Jane Doe')).edit()

    await form.deleteButton.hover()
    await expect(page.getByRole('tooltip', { name: 'Delete' })).toBeVisible()
    let dialog = await form.openDeleteDialog()
    await expect(dialog.description).toBeVisible()
    await expect(dialog.root).toContainText('jane.doe@example.com')
    await dialog.cancelButton.click()
    await expect(dialog.root).toBeHidden()
    dialog = await form.openDeleteDialog()
    await dialog.closeButton.click()
    await expect(dialog.root).toBeHidden()
    await expect(page).toHaveURL(`/contacts/qa-book/${jane}/edit`)

    dialog = await form.openDeleteDialog()
    await dialog.confirmButton.click()

    await expect(page).toHaveURL('/contacts/qa-book')
    await expect(contacts.emptyState).toBeVisible()
    expect(await dav.getContact('qa-book', jane)).toBeNull()
  })

  test('EDIT-04 an edit keeps the fields the form does not show', async ({
    page,
    user,
    dav
  }) => {
    await dav.createAddressBook({ id: 'qa-book', name: 'QA Book' })
    const imported = await dav.putContact('qa-book', {
      firstName: 'Imported',
      lastName: 'Alpha',
      emails: ['imported.alpha@example.com'],
      categories: ['Sales', 'Paris'],
      org: 'Acme'
    })
    const contacts = await new LoginPage(page).loginAs(user)
    await contacts.openBook('QA Book')
    const contact = await contacts.openContact('Imported Alpha')

    const form = await contact.edit()
    await form.firstName.fill('Imp')
    await form.saveEdit('Imp Alpha')

    await contacts.reload()
    await expect(contact.detail('Sales')).toContainText('Paris')
    // ORG is not in the form: still in the vCard
    const vcard = await dav.getContact('qa-book', imported)
    expect(vcard).toContain('Acme')
    expect(vcard).toMatch(/FN:Imp Alpha/)
  })

  test('EDIT-05 uppercase vCard types are preselected', async ({
    page,
    user,
    dav
  }) => {
    await dav.createAddressBook({ id: 'qa-book', name: 'QA Book' })
    await dav.putContact('qa-book', {
      firstName: 'Upper',
      lastName: 'Case',
      phones: [{ value: '+33600000001', type: 'CELL' }],
      addresses: [{ value: '10 Avenue des Champs', type: 'WORK' }]
    })
    const contacts = await new LoginPage(page).loginAs(user)
    await contacts.openBook('QA Book')
    const contact = await contacts.openContact('Upper Case')

    let form = await contact.edit()
    await expect(form.typeSelectors).toHaveText(['Mobile', 'Work'])
    await form.lastName.fill('Kept')
    await form.saveEdit('Upper Kept')

    await expect(contact.detail('+33600000001')).toContainText('Mobile')
    await expect(contact.detail('10 Avenue des Champs')).toContainText('Work')
    form = await contact.edit()
    await expect(form.typeSelectors).toHaveText(['Mobile', 'Work'])
  })

  test('EDIT-06 move a contact to another address book', async ({
    page,
    user,
    dav
  }) => {
    await dav.createAddressBook({ id: 'qa-book', name: 'QA Book' })
    const mover = await dav.putContact('contacts', {
      firstName: 'Mover',
      lastName: 'Test',
      emails: ['mover@example.com']
    })
    const contacts = await new LoginPage(page).loginAs(user)
    const contact = await contacts.openContact('Mover Test')
    await expect(page).toHaveURL(`/contacts/contacts/${mover}`)

    const form = await contact.edit()
    await expect(form.addressBook).toHaveText('My contacts')
    await form.chooseAddressBook('QA Book')
    await form.save()

    await expect(page).toHaveURL(`/contacts/qa-book/${mover}`)
    await expect(contact.name).toHaveText('Mover Test')
    await expect(contact.detail('mover@example.com')).toBeVisible()
    await expect(contacts.book('QA Book')).toHaveAttribute(
      'aria-current',
      'page'
    )
    await contact.backLink.click()
    await expect(page).toHaveURL('/contacts/qa-book')
    await expect(contacts.row('Mover Test')).toBeVisible()
    await contacts.openMyContacts()
    await expect(contacts.row('Mover Test')).toHaveCount(1)
    expect(await dav.contactNames('contacts')).toEqual([])
    expect(await dav.contactNames('qa-book')).toEqual(['Mover Test'])
    await contacts.reload()
    await expect(contacts.row('Mover Test')).toHaveCount(1)
  })

  test('EDIT-07 move and edit in one save, between user books', async ({
    page,
    user,
    dav
  }) => {
    await dav.createAddressBook({ id: 'qa-book', name: 'QA Book' })
    await dav.createAddressBook({ id: 'friends', name: 'Friends' })
    const jane = await dav.putContact('qa-book', JANE)
    const contacts = await new LoginPage(page).loginAs(user)
    await contacts.openBook('QA Book')
    const contact = await contacts.openContact('Jane Doe')

    const form = await contact.edit()
    await form.lastName.fill('Moved')
    await form.chooseAddressBook('Friends')
    await form.save()

    await expect(page).toHaveURL(`/contacts/friends/${jane}`)
    await expect(contact.name).toHaveText('Jane Moved')
    await expect(contact.detail('+33612345678')).toContainText('Work')
    await expect(contact.detail('jane.doe@example.com')).toBeVisible()
    await expect(contact.detail('jane')).toBeVisible()
    expect(await dav.contactNames('qa-book')).toEqual([])
    expect(await dav.contactNames('friends')).toEqual(['Jane Moved'])

    await contacts.openFromSearch('moved', 'Jane Moved')
    await expect(page).toHaveURL(`/contacts/friends/${jane}`)
  })

  test('EDIT-08 move a contact into a read-write shared book', async ({
    page,
    user,
    users,
    dav,
    davFor
  }) => {
    const alice = await users.create({ prefix: 'alice' })
    await davFor(alice).createAddressBook({ id: 'qa-rw', name: 'Team RW' })
    await davFor(alice).share('qa-rw', user, READ_WRITE)
    await dav.putContact('contacts', { firstName: 'Bob', lastName: 'Mover' })
    const contacts = await new LoginPage(page).loginAs(user)
    const contact = await contacts.openContact('Bob Mover')

    const form = await contact.edit()
    await form.chooseAddressBook('Team RW')
    await form.save()

    const copy = await dav.sharedCopyOf(alice, 'qa-rw')
    await expect(page).toHaveURL(new RegExp(`/contacts/${copy}/[^/]+$`))
    await expect(contact.name).toHaveText('Bob Mover')
    expect(await dav.contactNames('contacts')).toEqual([])
    expect(await davFor(alice).contactNames('qa-rw')).toEqual(['Bob Mover'])
  })

  test('EDIT-09 an untyped address stays untyped', async ({ page, user }) => {
    const contacts = await new LoginPage(page).loginAs(user)
    let form = await contacts.clickCreate()
    await form.fill({
      firstName: 'Untyped',
      lastName: 'Addr',
      addresses: ['5 rue Neuve']
    })
    await form.save()
    const contact = await contacts.openContact('Untyped Addr')
    await expect(contact.detail('5 rue Neuve')).toHaveText('5 rue Neuve')

    form = await contact.edit()
    await expect(form.typeSelectors.last()).toHaveText('Label')
    await form.lastName.fill('Kept')
    await form.saveEdit('Untyped Kept')
    await contacts.reload()
    await expect(contact.detail('5 rue Neuve')).toHaveText('5 rue Neuve')
    form = await contact.edit()
    await expect(form.typeSelectors.last()).toHaveText('Label')
  })

  test('EDIT-10 the empty rows of the edit form are untyped and not saved', async ({
    page,
    user,
    dav
  }) => {
    await dav.putContact('contacts', { firstName: 'Bare', lastName: 'Name' })
    const contacts = await new LoginPage(page).loginAs(user)
    const contact = await contacts.openContact('Bare Name')

    let form = await contact.edit()
    await expect(form.typeSelectors).toHaveText(['Label', 'Label'])
    await form.lastName.fill('Kept')
    await form.saveEdit('Bare Kept')

    await expect(contact.details).toHaveCount(0)
    form = await contact.edit()
    await expect(form.typeSelectors).toHaveText(['Label', 'Label'])
    await expect(new ContactPage(page).notFound).toHaveCount(0)
  })

  test('EDIT-11 an edit keeps every nickname and every Matrix id', async ({
    page,
    user,
    dav
  }) => {
    await dav.createAddressBook({ id: 'qa-book', name: 'QA Book' })
    await dav.putJCard('qa-book', 'qa-multi', [
      ['fn', {}, 'text', 'Multi Value'],
      ['n', {}, 'text', ['Value', 'Multi', '', '', '']],
      ['nickname', {}, 'text', 'Mo', 'Mv'],
      ['socialprofile', { type: 'matrix' }, 'text', '@multi:example.com'],
      ['socialprofile', { type: 'Matrix' }, 'text', '@multi:other.example']
    ])
    const contacts = await new LoginPage(page).loginAs(user)
    await contacts.openBook('QA Book')
    const contact = await contacts.openContact('Multi Value')

    const form = await contact.edit()
    await expect(form.matrixId).toHaveValue('@multi:example.com')
    await form.firstName.fill('Multiple')
    await form.saveEdit('Multiple Value')

    const properties = await dav.getJCardProperties('qa-book', 'qa-multi')
    const nicknames = properties
      .filter(p => p[0] === 'nickname')
      .flatMap(p => p.slice(3))
      .flatMap(v => (typeof v === 'string' ? v.split(',') : v))
    expect(nicknames).toEqual(['Mo', 'Mv'])
    expect(
      properties.filter(p => p[0] === 'socialprofile').map(p => p[3])
    ).toEqual(['@multi:example.com', '@multi:other.example'])
  })

  test('EDIT-12 a saved email is a plain address and a saved URL a uri', async ({
    page,
    user,
    dav
  }) => {
    await dav.createAddressBook({ id: 'qa-book', name: 'QA Book' })
    await dav.putJCard('qa-book', 'qa-types', [
      ['fn', {}, 'text', 'Typed Values'],
      ['n', {}, 'text', ['Values', 'Typed', '', '', '']],
      ['email', { type: 'work' }, 'uri', 'mailto:typed.values@example.com'],
      ['url', {}, 'uri', 'https://example.com/typed']
    ])
    const contacts = await new LoginPage(page).loginAs(user)
    await contacts.openBook('QA Book')
    const contact = await contacts.openContact('Typed Values')

    const form = await contact.edit()
    await expect(form.emails).toHaveValue('typed.values@example.com')
    await form.firstName.fill('Retyped')
    await form.saveEdit('Retyped Values')

    const vcard = (await dav.getContact('qa-book', 'qa-types')) ?? ''
    const emailLine = vcard.split(/\r?\n/).find(l => l.startsWith('EMAIL'))
    const urlLine = vcard.split(/\r?\n/).find(l => l.startsWith('URL'))
    expect(emailLine).toMatch(/:typed\.values@example\.com$/)
    expect(emailLine).not.toMatch(/mailto:|VALUE=URI/i)
    expect(urlLine).toMatch(/:https:\/\/example\.com\/typed$/)
    expect(urlLine).not.toMatch(/VALUE=TEXT/i)
  })
})
