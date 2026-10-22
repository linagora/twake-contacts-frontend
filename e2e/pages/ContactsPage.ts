import { expect, type Locator, type Page } from '@playwright/test'

import { ContactFormPage } from './ContactFormPage'
import { ContactPage } from './ContactPage'
import {
  AddSharedBookDialog,
  ContactTransferDialog,
  DeleteAddressBookDialog,
  DeleteContactDialog,
  EditAddressBookDialog,
  NewAddressBookDialog,
  ShareDialog
} from './dialogs'

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** A name, alone or followed by a second line (the owner of a shared book) */
export function startsWith(name: string): RegExp {
  return new RegExp(`^${escapeRegExp(name)}( |$)`)
}

/**
 * The application shell (sidebar, search bar, theme toggle) and the address book screens it
 * hosts: `/contacts` ("My contacts") and `/contacts/<bookId>`.
 *
 * The app exposes no `data-testid` on these screens: everything is located by accessible role
 * and name, in English (the default language of the stack).
 */
export class ContactsPage {
  readonly page: Page
  readonly sidebar: Locator
  readonly nav: Locator
  readonly main: Locator
  /** "Create" link at the top of the sidebar */
  readonly createLink: Locator
  /** "My contacts" entry; with nested books, a button with a "Collapse"/"Expand" chevron */
  readonly myContacts: Locator
  readonly myContactsChevron: Locator
  /** "+" right of "My contacts" */
  readonly newAddressBookButton: Locator
  /** The grey "Shared" caption of the sidebar */
  readonly sharedCaption: Locator
  /** "+" right of the "Shared" caption */
  readonly addSharedBookButton: Locator
  readonly searchBox: Locator
  readonly themeToggle: Locator
  /** Title of the list: "My contacts" or the name of the book */
  readonly heading: Locator
  readonly mineTab: Locator
  readonly sharedTab: Locator
  /** Import button of the header (above a non-empty list) or of the empty state */
  readonly importButton: Locator
  readonly table: Locator
  readonly rows: Locator
  readonly emptyState: Locator
  readonly addressBookNotFound: Locator
  readonly backLink: Locator
  /** The red banner of a failed action, under the search bar */
  readonly errorBanner: Locator

  constructor(page: Page) {
    this.page = page
    this.sidebar = page.getByRole('complementary')
    // in the sidebar, or in its drawer (a dialog) on phones
    this.nav = page.getByRole('navigation')
    this.main = page.getByRole('main').last()
    this.createLink = this.sidebar.getByRole('link', { name: 'Create' })
    this.myContacts = this.nav
      .getByRole('listitem')
      .first()
      .getByRole('button', { name: startsWith('My contacts') })
    this.myContactsChevron = this.myContacts.getByRole('button', {
      name: /^(Collapse|Expand)$/
    })
    this.newAddressBookButton = this.nav.getByRole('button', {
      name: 'New address book'
    })
    this.sharedCaption = this.nav.getByText('Shared', { exact: true })
    this.addSharedBookButton = this.nav.getByRole('button', {
      name: 'Add a shared address book'
    })
    this.searchBox = page.getByRole('combobox', { name: 'Search contacts...' })
    this.themeToggle = page.getByRole('button', {
      name: /^(Dark mode|Light mode)$/
    })
    this.heading = this.main.getByRole('heading', { level: 4 })
    this.mineTab = this.main.getByRole('tab', { name: 'My contacts' })
    this.sharedTab = this.main.getByRole('tab', { name: 'Shared with me' })
    this.importButton = this.main.getByRole('button', { name: 'Import' })
    this.table = this.main.getByRole('table')
    this.rows = this.table.getByRole('rowgroup').last().getByRole('row')
    this.emptyState = this.main.getByText('No contacts yet')
    this.addressBookNotFound = this.main.getByText('Address book not found')
    this.backLink = this.main.getByRole('link', { name: 'Back' })
    this.errorBanner = this.main.getByRole('alert')
  }

  /**
   * The app is signed in and shows its screens. Whatever the language and the screen size:
   * the locators of the specs wait for the content they need.
   */
  async expectLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/\/contacts/)
    await expect(this.main).toBeVisible()
  }

  /** The app is signed in and its address books are loaded, within a short delay */
  async #expectLoadedSoon(): Promise<void> {
    await expect(this.page).toHaveURL(/\/contacts/, { timeout: 10_000 })
    await expect(this.main).toBeVisible({ timeout: 10_000 })
  }

  /** Full reload: the app signs in silently again through Dex, then shows the same URL */
  async reload(): Promise<void> {
    const url = this.page.url()
    // a full load may die of net::ERR_NETWORK_CHANGED (LoginPage.loginAs): start again
    await expect(async () => {
      await this.page.goto(url)
      await this.#expectLoadedSoon()
    }).toPass({ timeout: 45_000 })
    await expect(this.page).toHaveURL(url)
  }

  /** Opens a path of the app with a full page load (silent sign in) */
  async open(path: string): Promise<void> {
    await expect(async () => {
      await this.page.goto(path)
      await this.#expectLoadedSoon()
    }).toPass({ timeout: 45_000 })
  }

  // ------------------------------------------------------------------ sidebar

  /** The sidebar entry of an address book (own, shared or added), by its name */
  bookEntry(name: string): Locator {
    return this.nav
      .getByRole('listitem')
      .filter({ has: this.page.getByText(name, { exact: true }) })
  }

  /** The clickable part of a sidebar entry; its name ends with the owner of a shared book */
  book(name: string): Locator {
    return this.bookEntry(name).getByRole('button', { name: startsWith(name) })
  }

  async openBook(name: string): Promise<void> {
    await this.book(name).click()
    await expect(this.heading).toHaveText(name)
  }

  async openMyContacts(): Promise<void> {
    await this.myContacts.click()
    await expect(this.page).toHaveURL(/\/contacts(\?.*)?$/)
  }

  /** The sidebar entries that have `aria-current="page"` */
  currentEntries(): Locator {
    return this.nav.locator('[aria-current="page"]')
  }

  /** Opens the "⋮" menu of a sidebar entry, shown on hover */
  async openBookMenu(name: string): Promise<Locator> {
    await this.bookEntry(name).hover()
    await this.bookEntry(name)
      .getByRole('button', { name: 'More actions' })
      .click()
    const menu = this.page.getByRole('menu')
    await expect(menu).toBeVisible()
    return menu
  }

  async openShareDialog(bookName: string): Promise<ShareDialog> {
    const menu = await this.openBookMenu(bookName)
    await menu.getByRole('menuitem', { name: 'Share' }).click()
    const dialog = new ShareDialog(this.page)
    await expect(dialog.root).toBeVisible()
    return dialog
  }

  /** "⋮" > Delete of an own book, "⋮" > Remove from my list of a book of another user */
  async openDeleteBookDialog(
    name: string,
    mode: 'Delete' | 'Remove' = 'Delete'
  ): Promise<DeleteAddressBookDialog> {
    const menu = await this.openBookMenu(name)
    await menu
      .getByRole('menuitem', {
        name: mode === 'Delete' ? 'Delete' : 'Remove from my list'
      })
      .click()
    const dialog = new DeleteAddressBookDialog(this.page, mode)
    await expect(dialog.root).toBeVisible()
    return dialog
  }

  async openEditBookDialog(name: string): Promise<EditAddressBookDialog> {
    const menu = await this.openBookMenu(name)
    await menu.getByRole('menuitem', { name: 'Edit' }).click()
    const dialog = new EditAddressBookDialog(this.page)
    await expect(dialog.root).toBeVisible()
    return dialog
  }

  async openNewAddressBookDialog(): Promise<NewAddressBookDialog> {
    await this.newAddressBookButton.click()
    const dialog = new NewAddressBookDialog(this.page)
    await expect(dialog.root).toBeVisible()
    return dialog
  }

  /** Creates an address book with the "+" dialog and waits for its sidebar entry */
  async createAddressBook(name: string): Promise<void> {
    const dialog = await this.openNewAddressBookDialog()
    await dialog.nameInput.fill(name)
    await dialog.createButton.click()
    await expect(dialog.root).toBeHidden()
    await expect(this.book(name).first()).toBeVisible()
  }

  async openAddSharedBookDialog(): Promise<AddSharedBookDialog> {
    await this.addSharedBookButton.click()
    const dialog = new AddSharedBookDialog(this.page)
    await expect(dialog.root).toBeVisible()
    return dialog
  }

  async clickCreate(): Promise<ContactFormPage> {
    await this.createLink.click()
    const form = new ContactFormPage(this.page)
    await form.expectLoaded()
    return form
  }

  // --------------------------------------------------------------------- list

  /** The row of a contact, by its full name */
  row(name: string): Locator {
    return this.rows.filter({
      has: this.page.getByRole('cell').first().getByText(name, { exact: true })
    })
  }

  /** Sort button of a sortable column header; its name ends with the direction when sorted */
  sortButton(column: 'Name' | 'Email'): Locator {
    return this.table
      .getByRole('columnheader')
      .getByRole('button', { name: startsWith(column) })
  }

  /** The header of a sortable column, which has `aria-sort` while the list is sorted by it */
  columnHeader(column: 'Name' | 'Email'): Locator {
    return this.table.getByRole('columnheader').filter({
      has: this.page.getByRole('button', { name: startsWith(column) })
    })
  }

  /** Names of the rows rendered (the table is virtualized: only the rows in view) */
  async rowNames(): Promise<string[]> {
    await expect(this.rows.first()).toBeVisible()
    return this.rows.evaluateAll(rows =>
      rows
        .map(row => row.querySelector('td p')?.textContent ?? '')
        .filter(name => name !== '')
    )
  }

  /**
   * Every name of the list, scrolling the virtualized table to its end: the next pages load
   * on the way.
   */
  async allRowNames(): Promise<string[]> {
    const seen: string[] = []
    let unchanged = 0
    await expect(this.rows.first()).toBeVisible()
    await this.rows.first().hover()
    while (unchanged < 4) {
      const before = seen.length
      for (const name of await this.rowNames()) {
        if (!seen.includes(name)) seen.push(name)
      }
      await this.page.mouse.wheel(0, 300)
      // the next page arrives asynchronously: count the rounds without a new name
      await this.page.waitForLoadState('networkidle')
      unchanged = seen.length === before ? unchanged + 1 : 0
    }
    return seen
  }

  /** Opens a contact from the list, through its email cell (the name opens a popover) */
  async openContact(name: string): Promise<ContactPage> {
    await this.row(name).getByRole('cell').nth(1).click()
    const contact = new ContactPage(this.page)
    await expect(contact.name).toHaveText(name)
    return contact
  }

  /** Opens the "..." menu of a row */
  async openRowMenu(name: string): Promise<Locator> {
    await this.row(name).getByRole('button', { name: 'More actions' }).click()
    const menu = this.page.getByRole('menu')
    await expect(menu).toBeVisible()
    return menu
  }

  /** Row "..." > Copy contact / Move contact */
  async openTransferDialog(
    name: string,
    mode: 'Copy' | 'Move'
  ): Promise<ContactTransferDialog> {
    const menu = await this.openRowMenu(name)
    await menu.getByRole('menuitem', { name: `${mode} contact` }).click()
    const dialog = new ContactTransferDialog(this.page, mode)
    await expect(dialog.root).toBeVisible()
    return dialog
  }

  async deleteFromList(name: string): Promise<void> {
    const menu = await this.openRowMenu(name)
    await menu.getByRole('menuitem', { name: 'Delete' }).click()
    const dialog = new DeleteContactDialog(this.page)
    await dialog.confirmButton.click()
    await expect(dialog.root).toBeHidden()
  }

  /** Picks a file for the Import button, as the native file chooser would */
  async importFile(name: string, content: string): Promise<void> {
    await this.importButton
      .first()
      .locator('input[type=file]')
      .setInputFiles({
        name,
        mimeType: 'text/vcard',
        buffer: Buffer.from(content)
      })
  }

  // ------------------------------------------------------------------- search

  /** A suggestion of the search bar, by the full name it shows next to its avatar */
  searchOption(name: string): Locator {
    return this.page
      .getByRole('option')
      .filter({ has: this.page.getByText(name, { exact: true }) })
  }

  async search(text: string): Promise<void> {
    await this.searchBox.fill(text)
  }

  /** Searches a contact and opens its suggestion */
  async openFromSearch(text: string, name: string): Promise<ContactPage> {
    await this.search(text)
    await this.searchOption(name).click()
    const contact = new ContactPage(this.page)
    await expect(contact.name).toHaveText(name)
    return contact
  }

  /** A toast (snackbar) or banner with this text */
  toast(text: string | RegExp): Locator {
    return this.page.getByRole('alert').filter({ hasText: text })
  }
}
