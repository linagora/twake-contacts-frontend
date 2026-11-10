import { ContactFormPage, LoginPage } from '../pages'
import { READ_ONLY, READ_WRITE } from '../support/dav'
import { expect, test } from '../support/fixtures'
import { popupUrl } from '../support/popups'

test.describe('CREATE create contact', () => {
  test('CREATE-01 create a contact in My contacts', async ({
    page,
    user,
    dav
  }) => {
    const contacts = await new LoginPage(page).loginAs(user)

    const form = await contacts.clickCreate()
    await expect(page).toHaveURL('/contacts/new')
    await expect(form.title).toHaveText('Create contact')
    await expect(form.addressBook).toHaveText('My contacts')
    await form.fill({
      firstName: 'Anna',
      lastName: 'Default',
      phones: ['+33611111111'],
      emails: ['anna@example.com']
    })
    await form.save()

    await expect(page).toHaveURL('/contacts')
    await expect(contacts.row('Anna Default')).toContainText('anna@example.com')
    await expect(contacts.row('Anna Default')).toContainText('+33611111111')
    expect(await dav.contactNames('contacts')).toEqual(['Anna Default'])
    await contacts.reload()
    await expect(contacts.row('Anna Default')).toBeVisible()
  })

  test('CREATE-02 a name is required and First name has the focus', async ({
    page,
    user
  }) => {
    const contacts = await new LoginPage(page).loginAs(user)
    const form = await contacts.clickCreate()

    await expect(form.firstName).toBeFocused()
    await form.fill({
      emails: ['nobody@example.com'],
      phones: ['+33600000000']
    })
    await expect(form.saveButton).toBeDisabled()
    await form.lastName.fill('Last')
    await expect(form.saveButton).toBeEnabled()
    await form.lastName.fill('')
    await form.firstName.fill('   ')
    await expect(form.saveButton).toBeDisabled()
  })

  test('CREATE-03 an invalid email blocks the save, spaces around it are trimmed', async ({
    page,
    user
  }) => {
    const contacts = await new LoginPage(page).loginAs(user)
    let form = await contacts.clickCreate()

    await form.fill({ firstName: 'Val', emails: ['not-an-email'] })
    await form.emails.first().press('Tab')
    await expect(
      form.main.getByText('Invalid email address, e.g. name@example.com')
    ).toBeVisible()
    await expect(form.emails.first()).toHaveAttribute('aria-invalid', 'true')
    await expect(form.saveButton).toBeDisabled()
    await form.emails.first().fill('val@example.com')
    await expect(
      form.main.getByText('Invalid email address, e.g. name@example.com')
    ).toHaveCount(0)
    await form.save()
    await expect(contacts.row('Val')).toContainText('val@example.com')

    form = await contacts.clickCreate()
    await form.fill({ firstName: 'Spacey', emails: ['  spacey@example.com  '] })
    await form.emails.first().press('Tab')
    await expect(
      form.main.getByText('Invalid email address, e.g. name@example.com')
    ).toHaveCount(0)
    await form.save()
    await expect(contacts.row('Spacey').getByRole('cell').nth(1)).toHaveText(
      'spacey@example.com'
    )
    const contact = await contacts.openContact('Spacey')
    await expect(contact.detail('spacey@example.com')).toHaveText(
      'Emailspacey@example.com'
    )
  })

  test('CREATE-04 add and remove rows', async ({ page, user }) => {
    const contacts = await new LoginPage(page).loginAs(user)
    const form = await contacts.clickCreate()
    await form.firstName.fill('Multi')

    await form.addButton.click()
    await expect(page.getByRole('menuitem')).toHaveText([
      'Add phone',
      'Add email',
      'Add address'
    ])
    await page.keyboard.press('Escape')
    await form.addRow('Add phone')
    await form.addRow('Add email')
    await form.addRow('Add address')
    await expect(form.phones).toHaveCount(2)
    await expect(form.emails).toHaveCount(2)
    await expect(form.addresses).toHaveCount(2)
    // only the extra rows can be removed
    await expect(form.removeButtons).toHaveCount(3)

    await form.fill({
      phones: ['+33611111111', '+33622222222'],
      emails: ['multi@example.com', 'removed@example.com'],
      addresses: ['1 First Street', '2 Second Street']
    })
    await form.emails
      .nth(1)
      .locator('xpath=ancestor::*[contains(@class, "MuiGrid-container")][1]')
      .getByRole('button', { name: 'Remove email' })
      .click()
    await expect(form.emails).toHaveCount(1)
    await form.save()

    const contact = await contacts.openContact('Multi')
    await expect(contact.detail('+33611111111')).toBeVisible()
    await expect(contact.detail('+33622222222')).toBeVisible()
    await expect(contact.detail('multi@example.com')).toBeVisible()
    await expect(contact.detail('removed@example.com')).toHaveCount(0)
    await expect(contact.detail('1 First Street')).toBeVisible()
    await expect(contact.detail('2 Second Street')).toBeVisible()
  })

  test('CREATE-05 type labels for phones and addresses', async ({
    page,
    user
  }) => {
    const contacts = await new LoginPage(page).loginAs(user)
    const form = await contacts.clickCreate()
    await form.firstName.fill('Typed')
    await expect(form.typeSelectors).toHaveText(['Label', 'Label'])

    await form.typeSelectors.first().click()
    await expect(page.getByRole('option')).toHaveText([
      'Label',
      'Mobile',
      'Work',
      'Home',
      'Other'
    ])
    await page.getByRole('option', { name: 'Work' }).click()
    await form.addRow('Add phone')
    await form.fill({
      phones: ['+33611111111', '+33622222222'],
      addresses: ['1 Typed Street']
    })
    await form.chooseType(1, 'Mobile')
    await form.typeSelectors.nth(2).click()
    await expect(page.getByRole('option')).toHaveText([
      'Label',
      'Home',
      'Work',
      'Other'
    ])
    await page.getByRole('option', { name: 'Home' }).click()
    await form.save()

    const contact = await contacts.openContact('Typed')
    await expect(contact.detail('+33611111111')).toContainText('Work')
    await expect(contact.detail('+33622222222')).toContainText('Mobile')
    await expect(contact.detail('1 Typed Street')).toContainText('Home')
    const edit = await contact.edit()
    await expect(edit.typeSelectors).toHaveText(['Work', 'Mobile', 'Home'])
  })

  test('CREATE-06 the header previews the name being typed', async ({
    page,
    user
  }) => {
    const contacts = await new LoginPage(page).loginAs(user)
    const form = await contacts.clickCreate()

    await expect(form.title).toHaveText('Create contact')
    await form.fill({ firstName: 'Marie', lastName: 'Curie' })
    await expect(form.title).toHaveText('Marie Curie')
    await expect(form.main.getByText('MC', { exact: true })).toBeVisible()

    await form.fill({ firstName: '   ', lastName: '   ' })
    await expect(form.title).toHaveText('Create contact')
    await expect(form.saveButton).toBeDisabled()
  })

  test('CREATE-07 choose the target address book', async ({
    page,
    user,
    users,
    dav,
    davFor
  }) => {
    const bob = await users.create({ prefix: 'bob' })
    await davFor(bob).createAddressBook({ id: 'bob-rw', name: 'Bob Writable' })
    await davFor(bob).share('bob-rw', user, READ_WRITE)
    await davFor(bob).createAddressBook({ id: 'bob-ro', name: 'Bob Read Only' })
    await davFor(bob).share('bob-ro', user, READ_ONLY)
    await dav.createAddressBook({ id: 'qa-book', name: 'QA Book' })
    const contacts = await new LoginPage(page).loginAs(user)

    const form = await contacts.clickCreate()
    const listbox = await form.openAddressBookSelector()
    await expect(listbox.getByRole('option')).toHaveText([
      'My contacts',
      'QA Book',
      `Bob Writable${bob.displayName}`
    ])
    await expect(listbox.getByText('Shared', { exact: true })).toHaveAttribute(
      'role',
      'presentation'
    )
    await listbox.getByRole('option', { name: 'QA Book' }).click()
    await form.firstName.fill('Picked')
    await form.save()

    await expect(page).toHaveURL('/contacts/qa-book')
    await expect(contacts.row('Picked')).toBeVisible()

    await contacts.clickCreate()
    await new ContactFormPage(page).backLink.click()
    await expect(page).toHaveURL('/contacts/qa-book')
    await contacts.openMyContacts()
    await contacts.clickCreate()
    await new ContactFormPage(page).backLink.click()
    await expect(page).toHaveURL('/contacts')
  })

  test('CREATE-08 a Matrix id enables the Chat button', async ({
    page,
    user
  }) => {
    const contacts = await new LoginPage(page).loginAs(user)
    const form = await contacts.clickCreate()
    await form.fill({
      firstName: 'Neo',
      lastName: 'Matrix',
      matrixId: 'neo',
      emails: ['neo@example.com']
    })
    await form.save()

    const contact = await contacts.openContact('Neo Matrix')

    await expect(contact.detail('neo')).toBeVisible()
    await expect(contact.chatButton).toBeEnabled()
    expect(await popupUrl(page, () => contact.chatButton.click())).toBe(
      'http://chat.e2e.local/#/chat/@neo'
    )
  })

  test('CREATE-09 the address book selector is sorted like the sidebar', async ({
    page,
    user,
    dav
  }) => {
    await dav.createAddressBook({ id: 'qa-z', name: 'Zeta' })
    await dav.createAddressBook({ id: 'qa-a', name: 'alpha' })
    await dav.createAddressBook({ id: 'qa-10', name: 'Book 10' })
    await dav.createAddressBook({ id: 'qa-2', name: 'Book 2' })
    const contacts = await new LoginPage(page).loginAs(user)

    const form = await contacts.clickCreate()
    const listbox = await form.openAddressBookSelector()

    await expect(listbox.getByRole('option')).toHaveText([
      'My contacts',
      'alpha',
      'Book 2',
      'Book 10',
      'Zeta'
    ])
  })
})
