import { DeleteContactDialog, LoginPage } from '../pages'
import { DEFAULT_BOOK, READ_ONLY, READ_WRITE } from '../support/dav'
import { expect, test } from '../support/fixtures'
import { popupUrl } from '../support/popups'

const JANE = {
  firstName: 'Jane',
  lastName: 'Doe',
  emails: ['jane.doe@example.com'],
  matrixId: 'jane'
}

test.describe('LIST contact list', () => {
  test('LIST-01 My contacts merges every address book', async ({
    page,
    user,
    dav
  }) => {
    await dav.createAddressBook({ id: 'qa-book', name: 'QA Book' })
    await dav.putContact('contacts', { firstName: 'Anna', lastName: 'Default' })
    await dav.putContact('qa-book', { firstName: 'Quentin', lastName: 'Book' })

    const contacts = await new LoginPage(page).loginAs(user)

    await expect(contacts.row('Anna Default')).toBeVisible()
    await expect(contacts.row('Quentin Book')).toBeVisible()
    await contacts.openBook('QA Book')
    await expect(contacts.row('Quentin Book')).toBeVisible()
    await expect(contacts.row('Anna Default')).toHaveCount(0)
  })

  test('LIST-02 columns of the list', async ({ page, user, dav }) => {
    await dav.putContact('contacts', {
      firstName: 'Imported',
      lastName: 'Alpha',
      emails: [{ value: 'imported.alpha@example.com', type: 'work' }],
      phones: [{ value: '+33600000001', type: 'cell' }],
      categories: ['Sales', 'Paris']
    })
    await dav.putContact('contacts', { firstName: 'No', lastName: 'Phone' })

    const contacts = await new LoginPage(page).loginAs(user)

    await expect(contacts.table.getByRole('columnheader')).toHaveText([
      // the sorted column also reads its direction to screen readers
      /^Name/,
      'Email',
      'Phone',
      'Team',
      ''
    ])
    await expect(contacts.row('Imported Alpha').getByRole('cell')).toHaveText([
      'IAImported Alpha',
      'imported.alpha@example.com',
      '+33600000001',
      'SalesParis',
      ''
    ])
    await expect(contacts.row('No Phone').getByRole('cell').nth(1)).toHaveText(
      '—'
    )
    await expect(contacts.row('No Phone').getByRole('cell').nth(2)).toHaveText(
      '—'
    )
  })

  test('LIST-03 empty state, without a header Import button', async ({
    page,
    user,
    dav
  }) => {
    await dav.createAddressBook({ id: 'empty', name: 'Empty Book' })
    const contacts = await new LoginPage(page).loginAs(user)

    await expect(contacts.emptyState).toBeVisible()
    await expect(
      contacts.main.getByText(
        'Your contacts will appear here once you add them.'
      )
    ).toBeVisible()
    // a single Import button: the one of the empty state
    await expect(contacts.importButton).toHaveCount(1)
    await expect(contacts.main.getByRole('progressbar')).toHaveCount(0)

    await contacts.openBook('Empty Book')
    await expect(contacts.emptyState).toBeVisible()
    await expect(contacts.importButton).toHaveCount(1)
  })

  test('LIST-04 clicking a cell opens the contact page, the actions column does not', async ({
    page,
    user,
    dav
  }) => {
    await dav.createAddressBook({ id: 'qa-book', name: 'QA Book' })
    const jane = await dav.putContact('qa-book', JANE)
    const anna = await dav.putContact('qa-book', {
      firstName: 'Anna',
      lastName: 'Phone',
      phones: ['+33611111111']
    })
    const contacts = await new LoginPage(page).loginAs(user)
    await contacts.openBook('QA Book')

    await contacts.row('Jane Doe').getByRole('cell').nth(1).click()
    await expect(page).toHaveURL(`/contacts/qa-book/${jane}`)
    await page.goBack()

    await contacts.row('Anna Phone').getByRole('cell').nth(2).click()
    await expect(page).toHaveURL(`/contacts/qa-book/${anna}`)
    await page.goBack()

    await contacts.row('Jane Doe').getByRole('cell').last().click()
    await expect(page).toHaveURL('/contacts/qa-book')
  })

  test('LIST-05 hover pencil and More actions menu', async ({
    page,
    user,
    dav
  }) => {
    await dav.createAddressBook({ id: 'qa-book', name: 'QA Book' })
    const jane = await dav.putContact('qa-book', JANE)
    await dav.putContact('qa-book', {
      firstName: 'Mail',
      lastName: 'Only',
      emails: ['mail.only@example.com']
    })
    const contacts = await new LoginPage(page).loginAs(user)
    await contacts.openBook('QA Book')

    const pencil = contacts
      .row('Jane Doe')
      .getByRole('button', { name: 'Edit' })
    await expect(pencil).toBeHidden()
    await contacts.row('Jane Doe').hover()
    await expect(pencil).toBeVisible()
    await pencil.hover()
    await expect(page.getByRole('tooltip', { name: 'Edit' })).toBeVisible()
    await pencil.click()
    await expect(page).toHaveURL(`/contacts/qa-book/${jane}/edit`)
    await page.goBack()

    let menu = await contacts.openRowMenu('Jane Doe')
    await expect(menu.getByRole('menuitem')).toHaveText([
      'Send email',
      'Open chat',
      'Create event',
      'Copy contact',
      'Move contact',
      'Delete'
    ])
    await expect(page).toHaveURL('/contacts/qa-book')
    await page.keyboard.press('Escape')

    menu = await contacts.openRowMenu('Mail Only')
    await expect(menu.getByRole('menuitem')).toHaveText([
      'Send email',
      'Create event',
      'Copy contact',
      'Move contact',
      'Delete'
    ])
  })

  test('LIST-06 the More actions menu opens the other apps', async ({
    page,
    user,
    dav
  }) => {
    await dav.createAddressBook({ id: 'qa-book', name: 'QA Book' })
    await dav.putContact('qa-book', JANE)
    const contacts = await new LoginPage(page).loginAs(user)
    await contacts.openBook('QA Book')

    const choose = async (item: string): Promise<string> =>
      popupUrl(page, async () => {
        const menu = await contacts.openRowMenu('Jane Doe')
        await menu.getByRole('menuitem', { name: item }).click()
      })

    expect(await choose('Send email')).toBe(
      'http://mail.e2e.local/mailto/?uri=mailto%3Ajane.doe%40example.com'
    )
    await expect(page.getByRole('menu')).toBeHidden()
    expect(await choose('Create event')).toBe(
      'http://calendar.e2e.local/newEvent?attendee=jane.doe%40example.com'
    )
    expect(await choose('Open chat')).toBe('http://chat.e2e.local/#/chat/@jane')
    await expect(page).toHaveURL('/contacts/qa-book')
    await expect(page.getByRole('menu')).toBeHidden()
  })

  test('LIST-07 delete a contact from the list', async ({
    page,
    user,
    dav
  }) => {
    await dav.createAddressBook({ id: 'qa-book', name: 'QA Book' })
    const jane = await dav.putContact('qa-book', JANE)
    const contacts = await new LoginPage(page).loginAs(user)
    await contacts.openBook('QA Book')
    const dialog = new DeleteContactDialog(page)

    let menu = await contacts.openRowMenu('Jane Doe')
    await menu.getByRole('menuitem', { name: 'Delete' }).click()
    await expect(dialog.description).toBeVisible()
    await expect(dialog.root).toContainText('JD')
    await expect(dialog.root).toContainText('Jane Doe')
    await expect(dialog.root).toContainText('jane.doe@example.com')
    await dialog.cancelButton.click()
    await expect(dialog.root).toBeHidden()

    menu = await contacts.openRowMenu('Jane Doe')
    await menu.getByRole('menuitem', { name: 'Delete' }).click()
    await dialog.closeButton.click()
    await expect(dialog.root).toBeHidden()
    await expect(contacts.row('Jane Doe')).toBeVisible()

    await contacts.deleteFromList('Jane Doe')

    await expect(contacts.row('Jane Doe')).toHaveCount(0)
    expect(await dav.getContact('qa-book', jane)).toBeNull()
    await contacts.reload()
    await expect(contacts.emptyState).toBeVisible()
    await contacts.openMyContacts()
    await expect(contacts.emptyState).toBeVisible()
  })

  test('LIST-09 lazy loading lists every contact once, in order', async ({
    page,
    user,
    dav
  }) => {
    const names = Array.from(
      { length: 60 },
      (_, i) => `Bulk ${String(i + 1).padStart(3, '0')}`
    )
    for (const name of names) {
      await dav.putContact('contacts', {
        firstName: 'Bulk',
        lastName: name.slice(5),
        emails: [`${name.replace(' ', '').toLowerCase()}@example.com`]
      })
    }
    const contacts = await new LoginPage(page).loginAs(user)

    expect(await contacts.allRowNames()).toEqual(names)
  })

  test('LIST-11 the row menu disables the email actions without email', async ({
    page,
    user,
    dav
  }) => {
    await dav.createAddressBook({ id: 'qa-book', name: 'QA Book' })
    await dav.putContact('qa-book', { firstName: 'No', lastName: 'Mail' })
    const contacts = await new LoginPage(page).loginAs(user)
    await contacts.openBook('QA Book')

    const menu = await contacts.openRowMenu('No Mail')

    await expect(
      menu.getByRole('menuitem', { name: 'Send email' })
    ).toBeDisabled()
    await expect(
      menu.getByRole('menuitem', { name: 'Create event' })
    ).toBeDisabled()
    await expect(menu.getByRole('menuitem', { name: 'Open chat' })).toHaveCount(
      0
    )
    await expect(menu.getByRole('menuitem', { name: 'Delete' })).toBeEnabled()
  })

  test('LIST-14 My contacts and Shared with me tabs', async ({
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
      lastName: 'Sharedone',
      emails: ['bobby@example.com']
    })
    await davFor(bob).share('bob-share', user, READ_ONLY)
    await dav.createAddressBook({ id: 'qa-book', name: 'QA Book' })
    await dav.putContact('contacts', { firstName: 'Anna', lastName: 'Default' })
    await dav.putContact('qa-book', { firstName: 'Quentin', lastName: 'Book' })
    const contacts = await new LoginPage(page).loginAs(user)
    const everyone = ['Anna Default', 'Bobby Sharedone', 'Quentin Book']

    await expect(contacts.mineTab).toHaveAttribute('aria-selected', 'true')
    await expect
      .poll(async () => (await contacts.rowNames()).sort())
      .toEqual(everyone)

    await contacts.sharedTab.click()
    await expect(page).toHaveURL('/contacts?scope=shared')
    await expect.poll(() => contacts.rowNames()).toEqual(['Bobby Sharedone'])
    await expect(contacts.heading).toHaveText('My contacts')

    await contacts.reload()
    await expect(contacts.sharedTab).toHaveAttribute('aria-selected', 'true')
    await expect.poll(() => contacts.rowNames()).toEqual(['Bobby Sharedone'])

    await contacts.mineTab.click()
    await expect(page).toHaveURL('/contacts')
    await expect
      .poll(async () => (await contacts.rowNames()).sort())
      .toEqual(everyone)

    // the tab belongs to /contacts: a book page has none, and coming back resets it
    await contacts.sharedTab.click()
    await contacts.openBook('QA Book')
    await expect(page).toHaveURL('/contacts/qa-book')
    await expect(contacts.mineTab).toHaveCount(0)
    await contacts.openMyContacts()
    await expect(contacts.mineTab).toHaveAttribute('aria-selected', 'true')

    await contacts.openBook('Bob Shared')
    await expect(contacts.mineTab).toHaveCount(0)
    await expect.poll(() => contacts.rowNames()).toEqual(['Bobby Sharedone'])
  })

  test('LIST-15 Shared with me without shared books shows the empty state, no Import', async ({
    page,
    user,
    dav
  }) => {
    await dav.putContact('contacts', { firstName: 'Carol', lastName: 'Own' })
    const contacts = await new LoginPage(page).loginAs(user)

    await contacts.sharedTab.click()

    await expect(contacts.emptyState).toBeVisible()
    await expect(contacts.importButton).toHaveCount(0)

    await contacts.mineTab.click()
    await expect(contacts.row('Carol Own')).toBeVisible()
    await expect(contacts.importButton).toHaveCount(1)
  })

  test('LIST-17 created and renamed contacts take their sorted place without reload', async ({
    page,
    user
  }) => {
    const contacts = await new LoginPage(page).loginAs(user)
    await contacts.createAddressBook('Order')
    await contacts.openBook('Order')
    const create = async (firstName: string): Promise<void> => {
      const form = await contacts.clickCreate()
      await form.fill({ firstName, lastName: 'One' })
      await form.save()
      await expect(contacts.row(`${firstName} One`)).toBeVisible()
    }
    for (const name of ['Bravo', 'Delta', 'Foxtrot']) await create(name)

    await create('Charlie')
    await expect
      .poll(() => contacts.rowNames())
      .toEqual(['Bravo One', 'Charlie One', 'Delta One', 'Foxtrot One'])

    const contact = await contacts.openContact('Foxtrot One')
    const form = await contact.edit()
    await form.firstName.fill('Alpha')
    await form.saveEdit('Alpha One')
    await contact.backLink.click()
    await expect
      .poll(() => contacts.rowNames())
      .toEqual(['Alpha One', 'Bravo One', 'Charlie One', 'Delta One'])

    await create('Écho')
    const nine = await contacts.clickCreate()
    await nine.fill({ firstName: '9', lastName: 'Numbers' })
    await nine.save()
    const expected = [
      '9 Numbers',
      'Alpha One',
      'Bravo One',
      'Charlie One',
      'Delta One',
      'Écho One'
    ]
    await expect.poll(() => contacts.rowNames()).toEqual(expected)

    await contacts.reload()
    await expect.poll(() => contacts.rowNames()).toEqual(expected)
  })

  test('LIST-20 copy a contact to another address book from the row menu', async ({
    page,
    user,
    users,
    dav,
    davFor
  }) => {
    await dav.createAddressBook({ id: 'src', name: 'Source' })
    await dav.createAddressBook({ id: 'dst', name: 'Destination' })
    const cora = await dav.putContact('src', {
      firstName: 'Cora',
      lastName: 'Copy',
      emails: ['cora@example.com'],
      phones: ['+33612345678'],
      categories: ['Sales']
    })
    const contacts = await new LoginPage(page).loginAs(user)
    await contacts.openBook('Source')

    const dialog = await contacts.openTransferDialog('Cora Copy', 'Copy')
    await expect(dialog.confirmButton).toBeDisabled()
    const options = await dialog.openDestinations()
    await expect(options.filter({ hasText: 'Destination' })).toHaveCount(1)
    await expect(options.filter({ hasText: 'Source' })).toHaveCount(0)
    await page.keyboard.press('Escape')
    await dialog.transferTo('Destination')

    await expect(contacts.toast('Contact copied successfully')).toBeVisible()
    await expect(contacts.row('Cora Copy')).toBeVisible()
    await expect.poll(() => dav.contactNames('dst')).toEqual(['Cora Copy'])
    expect(await dav.contactNames('src')).toEqual(['Cora Copy'])

    await contacts.reload()
    await contacts.openBook('Destination')
    const copy = await contacts.openContact('Cora Copy')
    await expect(copy.detail('cora@example.com')).toBeVisible()
    await expect(copy.detail('+33612345678')).toBeVisible()
    await expect(copy.detail('Sales')).toBeVisible()
    const copyId = new URL(page.url()).pathname.split('/').pop() ?? ''
    expect(copyId).not.toBe(cora)
    expect(await dav.getContact('dst', copyId)).toContain('CATEGORIES:Sales')

    // two distinct cards: editing the copy leaves the original alone
    const form = await copy.edit()
    await form.lastName.fill('Copied')
    await form.saveEdit('Cora Copied')
    expect(await dav.getContact('src', cora)).toContain('FN:Cora Copy')
    await contacts.openMyContacts()
    await expect(contacts.row('Cora Copy')).toHaveCount(1)
    await expect(contacts.row('Cora Copied')).toHaveCount(1)

    // into a read-write shared book
    const alice = await users.create({ prefix: 'alice' })
    await davFor(alice).createAddressBook({ id: 'qa-rw', name: 'Team RW' })
    await davFor(alice).share('qa-rw', user, READ_WRITE)
    await contacts.reload()
    await contacts.openBook('Source')
    await contacts
      .openTransferDialog('Cora Copy', 'Copy')
      .then(transfer => transfer.transferTo('Team RW'))
    await expect(contacts.toast('Contact copied successfully')).toBeVisible()
    await expect
      .poll(() => davFor(alice).contactNames('qa-rw'))
      .toEqual(['Cora Copy'])
    expect(await dav.contactNames('src')).toEqual(['Cora Copy'])
  })

  test('LIST-21 move a contact to another address book from the row menu', async ({
    page,
    user,
    users,
    dav,
    davFor
  }) => {
    await dav.createAddressBook({ id: 'src', name: 'Source' })
    await dav.createAddressBook({ id: 'dst', name: 'Destination' })
    const mona = await dav.putContact('src', {
      firstName: 'Mona',
      lastName: 'Move',
      emails: ['mona@example.com']
    })
    await dav.putContact('src', { firstName: 'Stay', lastName: 'Here' })
    const contacts = await new LoginPage(page).loginAs(user)
    await contacts.openBook('Source')

    const dialog = await contacts.openTransferDialog('Mona Move', 'Move')
    await expect(dialog.confirmButton).toBeDisabled()
    const options = await dialog.openDestinations()
    await expect(options.filter({ hasText: 'Destination' })).toHaveCount(1)
    await expect(options.filter({ hasText: 'Source' })).toHaveCount(0)
    await page.keyboard.press('Escape')
    await expect(dialog.root).toBeVisible()
    await dialog.transferTo('Destination')

    await expect(contacts.toast('Contact moved successfully')).toBeVisible()
    await expect(contacts.row('Mona Move')).toHaveCount(0)
    await expect(contacts.row('Stay Here')).toBeVisible()
    await expect.poll(() => dav.contactNames('dst')).toEqual(['Mona Move'])
    expect(await dav.contactNames('src')).toEqual(['Stay Here'])
    expect(await dav.getContact('dst', mona)).toContain('mona@example.com')

    await contacts.reload()
    await contacts.openBook('Destination')
    await expect(contacts.row('Mona Move')).toHaveCount(1)
    await contacts.openMyContacts()
    await expect(contacts.row('Mona Move')).toHaveCount(1)

    // into a read-write shared book
    const alice = await users.create({ prefix: 'alice' })
    await davFor(alice).createAddressBook({ id: 'qa-rw', name: 'Team RW' })
    await davFor(alice).share('qa-rw', user, READ_WRITE)
    await dav.putContact(DEFAULT_BOOK, {
      firstName: 'Sean',
      lastName: 'Shared'
    })
    await contacts.reload()
    await contacts
      .openTransferDialog('Sean Shared', 'Move')
      .then(transfer => transfer.transferTo('Team RW'))
    await expect(contacts.toast('Contact moved successfully')).toBeVisible()
    await expect
      .poll(() => davFor(alice).contactNames('qa-rw'))
      .toEqual(['Sean Shared'])
    expect(await dav.contactNames(DEFAULT_BOOK)).toEqual([])
  })

  test('LIST-22 the Name and Email headers sort the list both ways', async ({
    page,
    user,
    dav
  }) => {
    await dav.createAddressBook({ id: 'qa-book', name: 'QA Book' })
    // the order of the names is the reverse of the order of the emails
    for (const [firstName, email] of [
      ['Anna', 'zed'],
      ['Bert', 'mid'],
      ['Carl', 'abe']
    ]) {
      await dav.putContact('qa-book', {
        firstName,
        lastName: 'Sort',
        emails: [`${email}@example.com`]
      })
    }
    const contacts = await new LoginPage(page).loginAs(user)
    await contacts.openBook('QA Book')
    const byName = ['Anna Sort', 'Bert Sort', 'Carl Sort']
    const reversed = [...byName].reverse()

    await expect.poll(() => contacts.rowNames()).toEqual(byName)
    await expect(contacts.columnHeader('Name')).toHaveAttribute(
      'aria-sort',
      'ascending'
    )
    await expect(contacts.sortButton('Name')).toHaveAccessibleName(
      'Name sorted ascending'
    )
    await expect(contacts.columnHeader('Email')).not.toHaveAttribute(
      'aria-sort',
      /./
    )

    await contacts.sortButton('Email').click()
    await expect.poll(() => contacts.rowNames()).toEqual(reversed)
    await expect(contacts.columnHeader('Email')).toHaveAttribute(
      'aria-sort',
      'ascending'
    )
    await expect(contacts.columnHeader('Name')).not.toHaveAttribute(
      'aria-sort',
      /./
    )
    await expect(contacts.sortButton('Name')).toHaveAccessibleName('Name')

    await contacts.sortButton('Email').click()
    await expect.poll(() => contacts.rowNames()).toEqual(byName)
    await expect(contacts.columnHeader('Email')).toHaveAttribute(
      'aria-sort',
      'descending'
    )
    await expect(contacts.sortButton('Email')).toHaveAccessibleName(
      'Email sorted descending'
    )

    await contacts.sortButton('Name').click()
    await expect.poll(() => contacts.rowNames()).toEqual(byName)
    await expect(contacts.columnHeader('Name')).toHaveAttribute(
      'aria-sort',
      'ascending'
    )
    await contacts.sortButton('Name').click()
    await expect.poll(() => contacts.rowNames()).toEqual(reversed)
    await expect(contacts.columnHeader('Name')).toHaveAttribute(
      'aria-sort',
      'descending'
    )

    // the sort is not kept: a reload is back to Name ascending
    await contacts.reload()
    await expect.poll(() => contacts.rowNames()).toEqual(byName)
    await expect(contacts.columnHeader('Name')).toHaveAttribute(
      'aria-sort',
      'ascending'
    )
  })

  test('LIST-23 sorting a long list by email lists every contact once, in order', async ({
    page,
    user,
    dav
  }) => {
    // the emails run backwards: sorted by email, the list is the reverse of the names
    const names = Array.from(
      { length: 60 },
      (_, i) => `Bulk ${String(i + 1).padStart(3, '0')}`
    )
    for (const [i, name] of names.entries()) {
      await dav.putContact('contacts', {
        firstName: 'Bulk',
        lastName: name.slice(5),
        emails: [`mail${String(names.length - i).padStart(3, '0')}@example.com`]
      })
    }
    const contacts = await new LoginPage(page).loginAs(user)
    await expect.poll(() => contacts.rowNames()).toContain('Bulk 001')

    await contacts.sortButton('Email').click()
    await expect
      .poll(async () => (await contacts.rowNames())[0])
      .toBe('Bulk 060')
    expect(await contacts.allRowNames()).toEqual([...names].reverse())

    // the list stays where it was scrolled to: back to its top
    await contacts.sortButton('Name').click()
    await contacts.rows.first().hover()
    await page.mouse.wheel(0, -100_000)
    await expect
      .poll(async () => (await contacts.rowNames())[0])
      .toBe('Bulk 001')
    expect(await contacts.allRowNames()).toEqual(names)
  })
})
