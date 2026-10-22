import { LoginPage } from '../pages'
import { expect, test } from '../support/fixtures'

test.describe('ABOOK address books', () => {
  test('ABOOK-01 create an address book from the sidebar', async ({
    page,
    user,
    dav
  }) => {
    const contacts = await new LoginPage(page).loginAs(user)

    await contacts.newAddressBookButton.hover()
    await expect(
      page.getByRole('tooltip', { name: 'New address book' })
    ).toBeVisible()
    const dialog = await contacts.openNewAddressBookDialog()
    await expect(
      dialog.root.getByText('Enter a new address book name')
    ).toBeVisible()
    await expect(dialog.nameInput).toBeFocused()
    await expect(dialog.createButton).toBeDisabled()
    await expect(dialog.closeButton).toBeVisible()

    await dialog.nameInput.fill('Friends')
    await dialog.createButton.click()

    await expect(dialog.root).toBeHidden()
    await expect(
      contacts.toast('Address book created successfully')
    ).toBeVisible()
    await expect(page).toHaveURL('/contacts')
    await expect(contacts.book('Friends')).toBeVisible()
    await expect(contacts.myContactsChevron).toBeVisible()

    await contacts.openBook('Friends')
    await expect(page).toHaveURL(/\/contacts\/[0-9a-f-]{36}$/)
    await expect(contacts.emptyState).toBeVisible()
    await expect(contacts.importButton).toBeVisible()

    await contacts.reload()
    await expect(contacts.book('Friends')).toBeVisible()
    expect(
      (await dav.listAddressBooks()).filter(book => book.name === 'Friends')
    ).toHaveLength(1)
  })

  test('ABOOK-02 the dialog trims the name, Cancel, X and Escape create nothing', async ({
    page,
    user,
    dav
  }) => {
    const contacts = await new LoginPage(page).loginAs(user)

    let dialog = await contacts.openNewAddressBookDialog()
    await dialog.nameInput.fill('   ')
    await expect(dialog.createButton).toBeDisabled()
    await dialog.nameInput.press('Enter')
    await expect(dialog.root).toBeVisible()
    await dialog.nameInput.fill('  Trimmed  ')
    await expect(dialog.createButton).toBeEnabled()
    await dialog.cancelButton.click()
    await expect(dialog.root).toBeHidden()

    dialog = await contacts.openNewAddressBookDialog()
    await expect(dialog.nameInput).toHaveValue('')
    await dialog.closeButton.click()
    await expect(dialog.root).toBeHidden()
    dialog = await contacts.openNewAddressBookDialog()
    await page.keyboard.press('Escape')
    await expect(dialog.root).toBeHidden()
    await expect(contacts.myContactsChevron).toHaveCount(0)

    dialog = await contacts.openNewAddressBookDialog()
    await dialog.nameInput.fill('Trimmed  ')
    await dialog.createButton.click()
    await expect(contacts.bookEntry('Trimmed')).toHaveText('Trimmed')

    // Enter submits like Create
    dialog = await contacts.openNewAddressBookDialog()
    await dialog.nameInput.fill('Entered')
    await dialog.nameInput.press('Enter')
    await expect(dialog.root).toBeHidden()
    await expect(contacts.book('Entered')).toBeVisible()

    const names = (await dav.listAddressBooks()).map(book => book.name)
    expect(names).toContain('Trimmed')
    expect(names.filter(name => name === 'Entered')).toHaveLength(1)
  })

  test('ABOOK-03 a new address book can be used at once', async ({
    page,
    user
  }) => {
    const contacts = await new LoginPage(page).loginAs(user)
    await contacts.createAddressBook('Work Book')
    await contacts.openBook('Work Book')
    const bookUrl = new URL(page.url()).pathname

    const form = await contacts.clickCreate()
    await expect(page).toHaveURL(`${bookUrl}/new`)
    await expect(form.addressBook).toHaveText('Work Book')
    await form.fill({ firstName: 'Wendy' })
    await form.save()

    await expect(page).toHaveURL(bookUrl)
    await expect(contacts.row('Wendy')).toBeVisible()
    await contacts.openMyContacts()
    await expect(contacts.row('Wendy')).toBeVisible()
  })

  test('ABOOK-04 two address books with the same name stay apart', async ({
    page,
    user
  }) => {
    const contacts = await new LoginPage(page).loginAs(user)
    await contacts.createAddressBook('Twins')
    await contacts.createAddressBook('Twins')
    await expect(contacts.book('Twins')).toHaveCount(2)

    await contacts.book('Twins').first().click()
    const firstUrl = new URL(page.url()).pathname
    const form = await contacts.clickCreate()
    await form.fill({ firstName: 'Twin', lastName: 'One' })
    await form.save()
    await expect(page).toHaveURL(firstUrl)
    await expect(contacts.row('Twin One')).toBeVisible()

    await contacts.book('Twins').last().click()
    await expect(page).not.toHaveURL(firstUrl)
    await expect(contacts.emptyState).toBeVisible()
    await expect(contacts.toast(/./)).toHaveCount(0)
  })

  test('ABOOK-05 several clicks on Create make one address book', async ({
    page,
    user,
    dav
  }) => {
    const contacts = await new LoginPage(page).loginAs(user)
    const dialog = await contacts.openNewAddressBookDialog()
    await dialog.nameInput.fill('Once')

    await dialog.createButton.click({ clickCount: 3 })

    await expect(dialog.root).toBeHidden()
    await expect(contacts.book('Once')).toHaveCount(1)
    await contacts.reload()
    await expect(contacts.book('Once')).toHaveCount(1)
    expect(
      (await dav.listAddressBooks()).filter(book => book.name === 'Once')
    ).toHaveLength(1)
  })

  test('ABOOK-07 delete an own address book and its contacts', async ({
    page,
    user,
    dav
  }) => {
    await dav.createAddressBook({ id: 'keep', name: 'Keep' })
    await dav.putContact('keep', { firstName: 'Kept', lastName: 'Person' })
    await dav.createAddressBook({ id: 'doomed', name: 'Doomed' })
    await dav.putContact('doomed', { firstName: 'Gone', lastName: 'Person' })
    await dav.createAddressBook({ id: 'other', name: 'Other' })
    const bookIds = async (): Promise<string[]> =>
      (await dav.listAddressBooks()).map(book => book.id)
    const contacts = await new LoginPage(page).loginAs(user)
    await contacts.openBook('Doomed')

    let dialog = await contacts.openDeleteBookDialog('Doomed')
    await expect(dialog.root).toContainText(
      '“Doomed” and all its contacts will be permanently deleted.'
    )
    await expect(dialog.root).toContainText('1 contact')
    await dialog.cancelButton.click()
    await expect(dialog.root).toBeHidden()
    dialog = await contacts.openDeleteBookDialog('Doomed')
    await dialog.closeButton.click()
    await expect(dialog.root).toBeHidden()
    await expect(contacts.book('Doomed')).toBeVisible()
    expect(await bookIds()).toContain('doomed')

    dialog = await contacts.openDeleteBookDialog('Doomed')
    await dialog.confirmButton.click()

    await expect(dialog.root).toBeHidden()
    await expect(page).toHaveURL('/contacts')
    await expect(contacts.bookEntry('Doomed')).toHaveCount(0)
    await expect(contacts.row('Kept Person')).toBeVisible()
    await expect(contacts.row('Gone Person')).toHaveCount(0)
    await expect.poll(bookIds).not.toContain('doomed')
    expect(await bookIds()).toEqual(expect.arrayContaining(['keep', 'other']))
    expect(await dav.contactNames('keep')).toEqual(['Kept Person'])

    // a book that is not open: the page stays
    await contacts.openBook('Keep')
    dialog = await contacts.openDeleteBookDialog('Other')
    await dialog.confirmButton.click()
    await expect(contacts.bookEntry('Other')).toHaveCount(0)
    await expect(page).toHaveURL('/contacts/keep')
    await expect(contacts.row('Kept Person')).toBeVisible()

    await contacts.reload()
    await expect(contacts.book('Keep')).toBeVisible()
    await expect(contacts.bookEntry('Doomed')).toHaveCount(0)
    await expect(contacts.bookEntry('Other')).toHaveCount(0)
    await contacts.open('/contacts/doomed')
    await expect(contacts.addressBookNotFound).toBeVisible()
  })
})
