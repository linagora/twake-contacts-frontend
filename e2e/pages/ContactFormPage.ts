import { expect, type Locator, type Page } from '@playwright/test'

import { ContactPage } from './ContactPage'
import { DeleteContactDialog } from './dialogs'

/** What `fill` types in the form: one value per row, rows added with "Add" as needed */
export interface ContactFormValues {
  firstName?: string
  lastName?: string
  phones?: string[]
  emails?: string[]
  addresses?: string[]
  matrixId?: string
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Create form (`/contacts/new`, `/contacts/new/<book>`) and edit form (`…/<id>/edit`) */
export class ContactFormPage {
  readonly page: Page
  readonly main: Locator
  readonly backLink: Locator
  readonly saveButton: Locator
  /** Trash icon, edit form only */
  readonly deleteButton: Locator
  /** "Create contact", "Edit contact" or the name being typed */
  readonly title: Locator
  readonly firstName: Locator
  readonly lastName: Locator
  readonly addressBook: Locator
  readonly phones: Locator
  readonly emails: Locator
  readonly addresses: Locator
  readonly matrixId: Locator
  /** Type selectors of the phone rows, then of the address rows */
  readonly typeSelectors: Locator
  readonly addButton: Locator
  readonly removeButtons: Locator

  constructor(page: Page) {
    this.page = page
    this.main = page.getByRole('main').last()
    this.backLink = this.main.getByRole('link', { name: 'Back' })
    this.saveButton = this.main.getByRole('button', { name: 'Save' })
    this.deleteButton = this.main.getByRole('button', { name: 'Delete' })
    this.title = this.main.getByRole('heading', { level: 4 })
    this.firstName = this.main.getByRole('textbox', { name: 'First name' })
    this.lastName = this.main.getByRole('textbox', { name: 'Last name' })
    this.addressBook = this.main.getByRole('combobox', { name: 'Address book' })
    this.phones = this.main.getByRole('textbox', { name: 'Phone', exact: true })
    this.emails = this.main.getByRole('textbox', { name: 'Email', exact: true })
    this.addresses = this.main.getByRole('textbox', {
      name: 'Address',
      exact: true
    })
    this.matrixId = this.main.getByRole('textbox', { name: 'Matrix id' })
    this.typeSelectors = this.main.getByRole('combobox', {
      name: /^(Phone|Address) type$/
    })
    this.addButton = this.main.getByRole('button', { name: 'Add', exact: true })
    this.removeButtons = this.main.getByRole('button', {
      name: /^Remove (phone|email|address)$/
    })
  }

  async expectLoaded(): Promise<void> {
    await expect(this.firstName).toBeVisible()
  }

  /** Adds a row with the "Add" menu: `Add phone`, `Add email` or `Add address` */
  async addRow(item: 'Add phone' | 'Add email' | 'Add address'): Promise<void> {
    await this.addButton.click()
    await this.page.getByRole('menuitem', { name: item }).click()
  }

  async #fillRows(
    rows: Locator,
    values: string[] | undefined,
    item: 'Add phone' | 'Add email' | 'Add address'
  ): Promise<void> {
    for (const [index, value] of (values ?? []).entries()) {
      if ((await rows.count()) <= index) await this.addRow(item)
      await rows.nth(index).fill(value)
    }
  }

  async fill(values: ContactFormValues): Promise<void> {
    if (values.firstName !== undefined) {
      await this.firstName.fill(values.firstName)
    }
    if (values.lastName !== undefined) await this.lastName.fill(values.lastName)
    await this.#fillRows(this.phones, values.phones, 'Add phone')
    await this.#fillRows(this.emails, values.emails, 'Add email')
    await this.#fillRows(this.addresses, values.addresses, 'Add address')
    if (values.matrixId !== undefined) {
      await this.matrixId.fill(values.matrixId)
    }
  }

  /** The options of the address book selector, captions excluded */
  async openAddressBookSelector(): Promise<Locator> {
    await this.addressBook.click()
    const listbox = this.page.getByRole('listbox')
    await expect(listbox).toBeVisible()
    return listbox
  }

  async chooseAddressBook(name: string): Promise<void> {
    const listbox = await this.openAddressBookSelector()
    await listbox
      .getByRole('option', {
        name: new RegExp(`^${escapeRegExp(name)}( |$)`)
      })
      .click()
    await expect(listbox).toBeHidden()
  }

  /** Picks a type (`Mobile`, `Work`, `Home`, `Other`) for the n-th type selector */
  async chooseType(index: number, type: string): Promise<void> {
    await this.typeSelectors.nth(index).click()
    await this.page.getByRole('option', { name: type, exact: true }).click()
  }

  /** Saves and waits for the page the app goes to: a list or the contact page */
  async save(): Promise<void> {
    await this.saveButton.click()
    await expect(this.saveButton).toBeHidden()
  }

  /** Saves an edit, which ends on the contact page */
  async saveEdit(expectedName: string): Promise<ContactPage> {
    await this.save()
    const contact = new ContactPage(this.page)
    await expect(contact.name).toHaveText(expectedName)
    return contact
  }

  async openDeleteDialog(): Promise<DeleteContactDialog> {
    await this.deleteButton.click()
    const dialog = new DeleteContactDialog(this.page)
    await expect(dialog.root).toBeVisible()
    return dialog
  }
}
