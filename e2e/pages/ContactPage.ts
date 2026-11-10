import { expect, type Locator, type Page } from '@playwright/test'

import { ContactFormPage } from './ContactFormPage'
import { DeleteContactDialog } from './dialogs'

/** Contact page: `/contacts/<bookId>/<contactId>` */
export class ContactPage {
  readonly page: Page
  readonly main: Locator
  readonly backLink: Locator
  readonly editButton: Locator
  /** Trash icon */
  readonly deleteButton: Locator
  /** Full name, under the large avatar */
  readonly name: Locator
  readonly sendEmailButton: Locator
  readonly chatButton: Locator
  readonly scheduleButton: Locator
  /** Rows of details: categories, phones, emails, Matrix id, addresses */
  readonly details: Locator
  readonly copyButtons: Locator
  readonly notFound: Locator

  constructor(page: Page) {
    this.page = page
    this.main = page.getByRole('main').last()
    this.backLink = this.main.getByRole('link', { name: 'Back' })
    this.editButton = this.main.getByRole('button', { name: 'Edit' })
    this.deleteButton = this.main.getByRole('button', { name: 'Delete' })
    this.name = this.main.getByRole('heading', { level: 1 })
    this.sendEmailButton = page.getByTestId('contact-mail-button')
    this.chatButton = page.getByTestId('contact-chat-button')
    this.scheduleButton = page.getByTestId('contact-calendar-button')
    this.details = this.main.getByRole('list').getByRole('listitem')
    this.copyButtons = this.main.getByRole('button', { name: 'Copy' })
    this.notFound = this.main.getByText('Contact not found')
  }

  /** The detail row showing exactly this value */
  detail(value: string): Locator {
    return this.details.filter({
      has: this.page.getByText(value, { exact: true })
    })
  }

  async edit(): Promise<ContactFormPage> {
    await this.editButton.click()
    const form = new ContactFormPage(this.page)
    await form.expectLoaded()
    return form
  }

  async openDeleteDialog(): Promise<DeleteContactDialog> {
    await this.deleteButton.click()
    const dialog = new DeleteContactDialog(this.page)
    await expect(dialog.root).toBeVisible()
    return dialog
  }
}
