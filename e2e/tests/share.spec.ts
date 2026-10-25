import type { Locator } from '@playwright/test'

import {
  type AddSharedBookDialog,
  ContactFormPage,
  ContactPage,
  LoginPage,
  ShareDialog
} from '../pages'
import { EDITOR, READ_ONLY, READ_WRITE } from '../support/dav'
import { expect, test } from '../support/fixtures'

test.describe('SHARE shared address books', () => {
  test('SHARE-01 a read-write shared book shows the owner contacts', async ({
    page,
    user,
    users,
    dav,
    davFor
  }) => {
    const alice = await users.create({ prefix: 'alice' })
    await davFor(alice).createAddressBook({ id: 'qa-rw', name: 'Team RW' })
    await davFor(alice).putContact('qa-rw', {
      firstName: 'Shared',
      lastName: 'Sam',
      emails: ['sam@example.com']
    })
    await davFor(alice).share('qa-rw', user, READ_WRITE)
    const contacts = await new LoginPage(page).loginAs(user)

    await expect(contacts.row('Shared Sam')).toBeVisible()
    await contacts.sharedTab.click()
    await expect(contacts.row('Shared Sam')).toBeVisible()

    await contacts.openBook('Team RW')
    const copy = await dav.sharedCopyOf(alice, 'qa-rw')
    await expect(page).toHaveURL(`/contacts/${copy}`)
    const contact = await contacts.openContact('Shared Sam')
    await expect(contact.detail('sam@example.com')).toBeVisible()
  })

  test('SHARE-02 the sharee of a read-write book creates and edits in it', async ({
    page,
    user,
    users,
    davFor
  }) => {
    const alice = await users.create({ prefix: 'alice' })
    await davFor(alice).createAddressBook({ id: 'qa-rw', name: 'Team RW' })
    const sam = await davFor(alice).putContact('qa-rw', {
      firstName: 'Shared',
      lastName: 'Sam',
      phones: ['+33611111111']
    })
    await davFor(alice).share('qa-rw', user, READ_WRITE)
    const contacts = await new LoginPage(page).loginAs(user)
    await contacts.openBook('Team RW')

    await expect(contacts.importButton).toBeVisible()
    await contacts.row('Shared Sam').hover()
    await expect(
      contacts.row('Shared Sam').getByRole('button', { name: 'Edit' })
    ).toBeVisible()

    const form = await contacts.clickCreate()
    await expect(form.addressBook).toHaveText(/^Team RW/)
    await form.fill({ firstName: 'Bob', lastName: 'Added' })
    await form.save()
    await expect(contacts.row('Bob Added')).toBeVisible()

    const contact = await contacts.openContact('Shared Sam')
    await expect(contact.editButton).toBeVisible()
    await expect(contact.deleteButton).toBeVisible()
    const edit = await contact.edit()
    await edit.phones.fill('+33622222222')
    await edit.saveEdit('Shared Sam')

    await expect
      .poll(async () => (await davFor(alice).contactNames('qa-rw')).sort())
      .toEqual(['Bob Added', 'Shared Sam'])
    expect(await davFor(alice).getContact('qa-rw', sam)).toContain(
      '+33622222222'
    )
  })

  test('SHARE-03 a read-only shared book offers no write action', async ({
    page,
    user,
    users,
    davFor
  }) => {
    const alice = await users.create({ prefix: 'alice' })
    await davFor(alice).createAddressBook({ id: 'qa-book', name: 'QA Book' })
    await davFor(alice).putContact('qa-book', {
      firstName: 'Read Only',
      lastName: 'Rita',
      emails: ['rita@example.com']
    })
    await davFor(alice).share('qa-book', user, READ_ONLY)
    const contacts = await new LoginPage(page).loginAs(user)
    await contacts.openBook('QA Book')

    await expect(contacts.row('Read Only Rita')).toBeVisible()
    await expect(contacts.importButton).toHaveCount(0)
    await contacts.row('Read Only Rita').hover()
    await expect(
      contacts.row('Read Only Rita').getByRole('button', { name: 'Edit' })
    ).toHaveCount(0)
    const menu = await contacts.openRowMenu('Read Only Rita')
    await expect(menu.getByRole('menuitem')).toHaveText([
      'Send email',
      'Create event'
    ])
    await page.keyboard.press('Escape')

    const form = await contacts.clickCreate()
    await expect(page).toHaveURL('/contacts/new')
    await expect(form.addressBook).toHaveText('My contacts')
    const listbox = await form.openAddressBookSelector()
    await expect(listbox.getByRole('option')).toHaveText(['My contacts'])
  })

  test('SHARE-04 a contact of a read-only shared book cannot be edited', async ({
    page,
    user,
    users,
    davFor
  }) => {
    const alice = await users.create({ prefix: 'alice' })
    await davFor(alice).createAddressBook({ id: 'qa-book', name: 'QA Book' })
    const rita = await davFor(alice).putContact('qa-book', {
      firstName: 'Read Only',
      lastName: 'Rita',
      emails: ['rita@example.com']
    })
    await davFor(alice).share('qa-book', user, READ_ONLY)
    const contacts = await new LoginPage(page).loginAs(user)
    await contacts.openBook('QA Book')

    const contact = await contacts.openContact('Read Only Rita')
    await expect(contact.detail('rita@example.com')).toBeVisible()
    await expect(contact.sendEmailButton).toBeVisible()
    await expect(contact.editButton).toHaveCount(0)
    await expect(contact.deleteButton).toHaveCount(0)

    // the form is offered: saving is refused with a translated message
    await contacts.open(`${new URL(page.url()).pathname}/edit`)
    const form = new ContactFormPage(page)
    await form.lastName.fill('Changed')
    await form.saveButton.click()
    await expect(contacts.errorBanner).toHaveText(
      "You don't have permission to modify this address book"
    )
    const vcard = await davFor(alice).getContact('qa-book', rita)
    expect(vcard).toContain('FN:Read Only Rita')
  })

  test('SHARE-06 share an own address book from the sidebar', async ({
    page,
    user,
    users,
    loginInNewContext
  }) => {
    const bob = await users.create({ prefix: 'bob' })
    const contacts = await new LoginPage(page).loginAs(user)
    await contacts.createAddressBook('Friends')
    await contacts.openBook('Friends')
    const create = await contacts.clickCreate()
    await create.fill({ firstName: 'Fran', lastName: 'Friend' })
    await create.save()

    await expect(
      contacts
        .bookEntry('Friends')
        .getByRole('button', { name: 'More actions' })
    ).toHaveCount(0)
    const menu = await contacts.openBookMenu('Friends')
    await expect(menu.getByRole('menuitem')).toHaveText([
      'Share',
      'Edit',
      'Delete'
    ])
    await menu.getByRole('menuitem', { name: 'Share' }).click()
    const dialog = new ShareDialog(page)
    await expect(dialog.root).toContainText('Share Friends')
    await expect(dialog.root).toContainText('1 contact')
    await expect(dialog.userInput).toBeFocused()
    await expect(dialog.inviteRole).toHaveText('Viewer')
    await expect(dialog.sendButton).toBeDisabled()
    await expect(dialog.member(user.email)).toContainText('You')
    await expect(dialog.member(user.email)).toContainText('Owner')
    await expect(dialog.emptyMembers).toBeVisible()

    await dialog.invite(bob.uid, bob.email, 'Editor')

    await expect(dialog.userInput).toHaveValue('')
    await expect(dialog.userInput).toBeFocused()
    await expect(dialog.inviteRole).toHaveText('Viewer')
    await expect(dialog.member(bob.email)).toContainText(bob.displayName)
    await expect(dialog.member(bob.email).getByRole('combobox')).toHaveText(
      'Editor'
    )
    await dialog.closeButton.click()

    const bobContacts = await loginInNewContext(bob)
    await expect(bobContacts.bookEntry('Friends')).toContainText(
      user.displayName
    )
    await bobContacts.openBook('Friends')
    const contact = await bobContacts.openContact('Fran Friend')
    await expect(contact.editButton).toBeVisible()
  })

  test('SHARE-07 change the role of a member and remove a member', async ({
    page,
    user,
    users,
    dav,
    davFor
  }) => {
    const bob = await users.create({ prefix: 'bob' })
    const carol = await users.create({ prefix: 'carol' })
    await dav.createAddressBook({ id: 'friends', name: 'Friends' })
    await dav.share('friends', bob, EDITOR)
    const contacts = await new LoginPage(page).loginAs(user)

    let dialog = await contacts.openShareDialog('Friends')
    await expect(dialog.member(bob.email).getByRole('combobox')).toHaveText(
      'Editor'
    )
    await dialog.invite(carol.uid, carol.email, 'Viewer')

    await dialog.member(bob.email).getByRole('combobox').click()
    await page.getByRole('option', { name: 'Viewer', exact: true }).click()
    await expect(dialog.member(bob.email).getByRole('combobox')).toHaveText(
      'Viewer'
    )
    await dialog.closeButton.click()
    dialog = await contacts.openShareDialog('Friends')
    await expect(dialog.member(bob.email).getByRole('combobox')).toHaveText(
      'Viewer'
    )
    await expect(dialog.root.getByRole('alert')).toHaveCount(0)

    await dialog.member(carol.email).getByRole('button').last().click()
    await expect(dialog.member(carol.email)).toHaveCount(0)
    await dialog.closeButton.click()
    dialog = await contacts.openShareDialog('Friends')
    await expect(dialog.member(bob.email)).toBeVisible()
    await expect(dialog.member(carol.email)).toHaveCount(0)

    await expect
      .poll(async () =>
        (await davFor(carol).listAddressBooks()).map(book => book.name)
      )
      .not.toContain('Friends')
  })

  test('SHARE-08 share suggestions skip the owner and the members', async ({
    page,
    users,
    davFor
  }) => {
    // one last name for the four of them: a search lists whoever may be invited
    const family = `fam${Date.now().toString(36)}`
    const owner = await users.create({ prefix: 'alice', lastName: family })
    const bob = await users.create({ prefix: 'bob', lastName: family })
    const carol = await users.create({ prefix: 'carol', lastName: family })
    const dave = await users.create({ prefix: 'dave', lastName: family })
    await davFor(owner).createAddressBook({ id: 'friends', name: 'Friends' })
    await davFor(owner).share('friends', bob, EDITOR)
    const contacts = await new LoginPage(page).loginAs(owner)
    const dialog = await contacts.openShareDialog('Friends')
    const suggestion = (email: string) =>
      page.getByRole('option').filter({ hasText: email })

    await dialog.userInput.fill(family)
    await expect(suggestion(carol.email)).toBeVisible()
    await expect(suggestion(dave.email)).toBeVisible()
    await expect(suggestion(owner.email)).toHaveCount(0)
    await expect(suggestion(bob.email)).toHaveCount(0)

    // a user already picked is not suggested twice
    await suggestion(carol.email).click()
    await dialog.userInput.fill(family)
    await expect(suggestion(dave.email)).toBeVisible()
    await expect(suggestion(carol.email)).toHaveCount(0)
  })

  test('SHARE-10 add a public address book of another user', async ({
    page,
    user,
    users,
    davFor
  }) => {
    const bob = await users.create({ prefix: 'bob' })
    await davFor(bob).createAddressBook({
      id: 'qa-pub',
      name: 'Bob Public Read'
    })
    await davFor(bob).putContact('qa-pub', {
      firstName: 'Paula',
      lastName: 'Public'
    })
    await davFor(bob).publish('qa-pub', '{DAV:}read')
    await davFor(bob).createAddressBook({
      id: 'qa-pubrw',
      name: 'Bob Public RW'
    })
    await davFor(bob).putContact('qa-pubrw', {
      firstName: 'Rita',
      lastName: 'Readwrite'
    })
    await davFor(bob).putContact('qa-pubrw', {
      firstName: 'Ron',
      lastName: 'Readwrite'
    })
    await davFor(bob).publish('qa-pubrw', '{DAV:}write')
    await davFor(bob).createAddressBook({ id: 'qa-priv', name: 'Bob Private' })
    const contacts = await new LoginPage(page).loginAs(user)

    await contacts.addSharedBookButton.hover()
    await expect(
      page.getByRole('tooltip', { name: 'Add a shared address book' })
    ).toBeVisible()
    const dialog = await contacts.openAddSharedBookDialog()
    await expect(
      dialog.root.getByText('Search for a user to see their address books')
    ).toBeVisible()
    await expect(dialog.userInput).toBeFocused()
    await expect(dialog.addButton).toBeDisabled()

    await dialog.pickUser(bob.uid, bob.email)
    await expect(dialog.root.getByText(bob.email)).toBeVisible()
    await expect(dialog.book('Bob Public Read')).toContainText('1 contact')
    await expect(dialog.book('Bob Public RW')).toContainText('2 contacts')
    await expect(dialog.root.getByText('Bob Private')).toHaveCount(0)
    await expect(dialog.addButton).toBeEnabled()

    await dialog.book('Bob Public RW').getByRole('button').click()
    await expect(dialog.book('Bob Public RW')).toHaveCount(0)
    await dialog.addButton.click()

    await expect(dialog.root).toBeHidden()
    await expect(
      contacts.toast('Address book added successfully')
    ).toBeVisible()
    await expect(contacts.book('Bob Public Read')).toBeVisible()
    await expect(contacts.book('Bob Public RW')).toHaveCount(0)

    await contacts.openBook('Bob Public Read')
    await expect(page).toHaveURL(/\/contacts\/[0-9a-f-]{36}$/)
    await expect(contacts.row('Paula Public')).toBeVisible()
    await contacts.reload()
    await expect(contacts.bookEntry('Bob Public Read')).toContainText(
      bob.displayName
    )
    await contacts.openMyContacts()
    await contacts.sharedTab.click()
    await expect(contacts.row('Paula Public')).toBeVisible()
  })

  test('SHARE-11 the add dialog explains why nothing can be added', async ({
    page,
    user,
    users
  }) => {
    const carol = await users.create({ prefix: 'carol' })
    const contacts = await new LoginPage(page).loginAs(user)
    const dialog = await contacts.openAddSharedBookDialog()

    await dialog.userInput.fill('zzqx-nobody')
    await expect(page.getByText('No user found')).toBeVisible()

    await dialog.pickUser(carol.uid, carol.email)
    await expect(
      dialog.root.getByText('This user has no address book available')
    ).toBeVisible()
    await expect(dialog.addButton).toBeDisabled()

    await dialog.cancelButton.click()
    await expect(dialog.root).toBeHidden()
    await contacts.openAddSharedBookDialog()
    await page.keyboard.press('Escape')
    await expect(dialog.root).toBeHidden()
  })

  test('SHARE-12 an added public read-only book is read-only', async ({
    page,
    user,
    users,
    davFor
  }) => {
    const bob = await users.create({ prefix: 'bob' })
    await davFor(bob).createAddressBook({
      id: 'qa-pub',
      name: 'Bob Public Read'
    })
    const paula = await davFor(bob).putContact('qa-pub', {
      firstName: 'Paula',
      lastName: 'Public',
      emails: ['paula@example.com']
    })
    await davFor(bob).publish('qa-pub', '{DAV:}read')
    const contacts = await new LoginPage(page).loginAs(user)
    const dialog = await contacts.openAddSharedBookDialog()
    await dialog.pickUser(bob.uid, bob.email)
    await dialog.addButton.click()
    await expect(dialog.root).toBeHidden()

    await contacts.openBook('Bob Public Read')
    await expect(contacts.importButton).toHaveCount(0)
    const menu = await contacts.openRowMenu('Paula Public')
    await expect(menu.getByRole('menuitem')).toHaveText([
      'Send email',
      'Create event'
    ])
    await page.keyboard.press('Escape')
    const contact = await contacts.openContact('Paula Public')
    await expect(contact.editButton).toHaveCount(0)
    await expect(contact.deleteButton).toHaveCount(0)

    const form = await contacts.clickCreate()
    const listbox = await form.openAddressBookSelector()
    await expect(listbox.getByRole('option')).toHaveText(['My contacts'])
    expect(await davFor(bob).getContact('qa-pub', paula)).toContain(
      'FN:Paula Public'
    )
    await expect(new ContactPage(page).notFound).toHaveCount(0)
  })

  test('SHARE-13 a sharee removes a shared book from their list, the owner keeps it', async ({
    page,
    user,
    users,
    dav,
    davFor
  }) => {
    const alice = await users.create({ prefix: 'alice' })
    await davFor(alice).createAddressBook({ id: 'team', name: 'Team' })
    await davFor(alice).putContact('team', {
      firstName: 'Teresa',
      lastName: 'Team'
    })
    await davFor(alice).share('team', user, EDITOR)
    const bob = await users.create({ prefix: 'bob' })
    await davFor(bob).createAddressBook({ id: 'qa-pub', name: 'Bob Public' })
    await davFor(bob).putContact('qa-pub', {
      firstName: 'Paula',
      lastName: 'Public'
    })
    await davFor(bob).publish('qa-pub', '{DAV:}read')
    const contacts = await new LoginPage(page).loginAs(user)
    await contacts.openBook('Team')
    const copy = await dav.sharedCopyOf(alice, 'team')

    const menu = await contacts.openBookMenu('Team')
    await expect(menu.getByRole('menuitem')).toHaveText([
      'Share',
      'Remove from my list'
    ])
    await page.keyboard.press('Escape')
    let dialog = await contacts.openDeleteBookDialog('Team', 'Remove')
    await expect(dialog.root).toContainText(
      '“Team” will be removed from your list.'
    )
    await expect(dialog.root).toContainText(alice.displayName)
    await dialog.cancelButton.click()
    await expect(dialog.root).toBeHidden()
    await expect(contacts.book('Team')).toBeVisible()

    dialog = await contacts.openDeleteBookDialog('Team', 'Remove')
    await dialog.confirmButton.click()

    await expect(dialog.root).toBeHidden()
    await expect(page).toHaveURL('/contacts')
    await expect(contacts.bookEntry('Team')).toHaveCount(0)
    await expect(contacts.emptyState).toBeVisible()
    await contacts.sharedTab.click()
    await expect(contacts.row('Teresa Team')).toHaveCount(0)
    await contacts.reload()
    await expect(contacts.bookEntry('Team')).toHaveCount(0)
    await expect(contacts.emptyState).toBeVisible()
    await contacts.open(`/contacts/${copy}`)
    await expect(contacts.addressBookNotFound).toBeVisible()

    // the original is untouched
    expect(
      (await davFor(alice).listAddressBooks()).map(book => book.id)
    ).toContain('team')
    expect(await davFor(alice).contactNames('team')).toEqual(['Teresa Team'])

    // an added public book: removed from the list, offered again
    let add = await contacts.openAddSharedBookDialog()
    await add.pickUser(bob.uid, bob.email)
    await add.addButton.click()
    await expect(add.root).toBeHidden()
    await expect(contacts.book('Bob Public')).toBeVisible()
    dialog = await contacts.openDeleteBookDialog('Bob Public', 'Remove')
    await dialog.confirmButton.click()
    await expect(contacts.bookEntry('Bob Public')).toHaveCount(0)
    expect(await davFor(bob).contactNames('qa-pub')).toEqual(['Paula Public'])
    add = await contacts.openAddSharedBookDialog()
    await add.pickUser(bob.uid, bob.email)
    await expect(add.book('Bob Public')).toContainText('1 contact')
  })

  test('SHARE-14 the Discovery switch makes a book public and private again', async ({
    page,
    user,
    users,
    dav,
    loginInNewContext
  }) => {
    const bob = await users.create({ prefix: 'bob' })
    await dav.createAddressBook({ id: 'disc', name: 'Disc' })
    await dav.putContact('disc', { firstName: 'Dina', lastName: 'Disc' })
    const contacts = await new LoginPage(page).loginAs(user)
    const bobContacts = await loginInNewContext(bob)
    const searchedByBob = async (): Promise<AddSharedBookDialog> => {
      await bobContacts.page.keyboard.press('Escape')
      const add = await bobContacts.openAddSharedBookDialog()
      await add.pickUser(user.uid, user.email)
      return add
    }

    let dialog = await contacts.openShareDialog('Disc')
    await expect(dialog.root).toContainText('Discovery')
    await expect(dialog.root).toContainText(
      'Allow others to find and add this address book through search.'
    )
    await expect(dialog.discoverySwitch).toBeEnabled()
    await expect(dialog.discoverySwitch).not.toBeChecked()
    await expect((await searchedByBob()).noneAvailable).toBeVisible()

    await dialog.discoverySwitch.click()
    await expect(dialog.discoverySwitch).toBeChecked()
    await expect(dialog.discoverySwitch).toBeEnabled()
    await expect.poll(() => dav.publicAddressBookIds()).toEqual(['disc'])
    await dialog.closeButton.click()
    await expect((await searchedByBob()).book('Disc')).toContainText(
      '1 contact'
    )

    await contacts.reload()
    dialog = await contacts.openShareDialog('Disc')
    await expect(dialog.discoverySwitch).toBeEnabled()
    await expect(dialog.discoverySwitch).toBeChecked()
    await dialog.discoverySwitch.click()
    await expect(dialog.discoverySwitch).not.toBeChecked()
    await expect(dialog.discoverySwitch).toBeEnabled()
    await expect.poll(() => dav.publicAddressBookIds()).toEqual([])
    await dialog.closeButton.click()
    await expect((await searchedByBob()).noneAvailable).toBeVisible()

    await contacts.reload()
    dialog = await contacts.openShareDialog('Disc')
    await expect(dialog.discoverySwitch).toBeEnabled()
    await expect(dialog.discoverySwitch).not.toBeChecked()
  })

  test('SHARE-15 a role change and a removal take effect for the member', async ({
    page,
    user,
    users,
    dav,
    davFor,
    loginInNewContext
  }) => {
    const bob = await users.create({ prefix: 'bob' })
    await dav.createAddressBook({ id: 'friends', name: 'Friends' })
    const fran = await dav.putContact('friends', {
      firstName: 'Fran',
      lastName: 'Friend',
      emails: ['fran@example.com']
    })
    await dav.share('friends', bob, READ_ONLY)
    const contacts = await new LoginPage(page).loginAs(user)
    const bobContacts = await loginInNewContext(bob)
    const copy = await davFor(bob).sharedCopyOf(user, 'friends')
    const pencil = (name: string): Locator =>
      bobContacts.row(name).getByRole('button', { name: 'Edit', exact: true })
    const setRole = async (role: 'Viewer' | 'Editor'): Promise<void> => {
      const dialog = await contacts.openShareDialog('Friends')
      const selector = dialog.member(bob.email).getByRole('combobox')
      await selector.click()
      await page.getByRole('option', { name: role, exact: true }).click()
      await expect(selector).toHaveText(role)
      await dialog.closeButton.click()
    }

    await bobContacts.openBook('Friends')
    await bobContacts.row('Fran Friend').hover()
    await expect(pencil('Fran Friend')).toHaveCount(0)

    // Viewer to Editor: bob can edit
    await setRole('Editor')
    await bobContacts.reload()
    await expect(bobContacts.importButton).toBeVisible()
    await bobContacts.row('Fran Friend').hover()
    await expect(pencil('Fran Friend')).toBeVisible()
    const contact = await bobContacts.openContact('Fran Friend')
    const form = await contact.edit()
    await form.lastName.fill('Edited')
    await form.saveEdit('Fran Edited')
    await expect
      .poll(() => dav.getContact('friends', fran))
      .toContain('FN:Fran Edited')

    // Editor to Viewer: no write action left, and the server refuses a write
    await setRole('Viewer')
    await bobContacts.open(`/contacts/${copy}`)
    await expect(bobContacts.row('Fran Edited')).toBeVisible()
    await expect(bobContacts.importButton).toHaveCount(0)
    await bobContacts.row('Fran Edited').hover()
    await expect(pencil('Fran Edited')).toHaveCount(0)
    const menu = await bobContacts.openRowMenu('Fran Edited')
    await expect(menu.getByRole('menuitem')).toHaveText([
      'Send email',
      'Create event'
    ])
    await bobContacts.page.keyboard.press('Escape')
    const viewed = await bobContacts.openContact('Fran Edited')
    await expect(viewed.editButton).toHaveCount(0)
    await expect(viewed.deleteButton).toHaveCount(0)
    await expect(
      davFor(bob).putContact(copy, { firstName: 'Not', lastName: 'Allowed' })
    ).rejects.toThrow(/403/)

    // removed: the book leaves bob's app
    const dialog = await contacts.openShareDialog('Friends')
    await dialog.member(bob.email).getByRole('button').last().click()
    await expect(dialog.member(bob.email)).toHaveCount(0)
    await dialog.closeButton.click()
    await bobContacts.open('/contacts')
    await expect(bobContacts.myContacts).toBeVisible()
    await expect(bobContacts.bookEntry('Friends')).toHaveCount(0)
    await expect(bobContacts.emptyState).toBeVisible()
    expect(await dav.contactNames('friends')).toEqual(['Fran Edited'])
  })

  test('SHARE-16 a sharee finds a removed private book again by searching for its owner', async ({
    page,
    user,
    users,
    davFor
  }) => {
    const alice = await users.create({ prefix: 'alice' })
    await davFor(alice).createAddressBook({ id: 'team', name: 'Team' })
    await davFor(alice).putContact('team', {
      firstName: 'Teresa',
      lastName: 'Team'
    })
    await davFor(alice).share('team', user, EDITOR)
    await davFor(alice).createAddressBook({ id: 'secret', name: 'Secret' })
    const contacts = await new LoginPage(page).loginAs(user)
    await expect(contacts.book('Team')).toBeVisible()

    // still in the list: not offered, and alice's other private book never is
    let add = await contacts.openAddSharedBookDialog()
    await add.pickUser(alice.uid, alice.email)
    await expect(add.root).toContainText('No more address books to add')
    await expect(add.book('Team')).toHaveCount(0)
    await expect(add.book('Secret')).toHaveCount(0)
    await add.cancelButton.click()

    const dialog = await contacts.openDeleteBookDialog('Team', 'Remove')
    await expect(dialog.root).toContainText(
      'You can find it again by searching for its owner.'
    )
    await dialog.confirmButton.click()
    await expect(contacts.bookEntry('Team')).toHaveCount(0)

    add = await contacts.openAddSharedBookDialog()
    await add.pickUser(alice.uid, alice.email)
    await expect(add.book('Team')).toContainText('1 contact')
    await expect(add.book('Secret')).toHaveCount(0)
    await add.addButton.click()
    await expect(add.root).toBeHidden()

    // the delegation comes back with its Editor role
    await contacts.openBook('Team')
    await expect(contacts.row('Teresa Team')).toBeVisible()
    const menu = await contacts.openBookMenu('Team')
    await expect(menu.getByRole('menuitem')).toHaveText([
      'Share',
      'Remove from my list'
    ])
    await page.keyboard.press('Escape')
    await contacts.reload()
    const reloaded = await contacts.openBookMenu('Team')
    await expect(reloaded.getByRole('menuitem')).toHaveText([
      'Share',
      'Remove from my list'
    ])
    await page.keyboard.press('Escape')
    const copy = await davFor(user).sharedCopyOf(alice, 'team')
    await davFor(user).putContact(copy, {
      firstName: 'Back',
      lastName: 'Again'
    })
    expect(await davFor(alice).contactNames('team')).toEqual(
      expect.arrayContaining(['Back Again', 'Teresa Team'])
    )
  })
})
