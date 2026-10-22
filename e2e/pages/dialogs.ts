import { expect, type Locator, type Page } from '@playwright/test'

/** "Delete this contact?", from the list, the contact page and the edit form */
export class DeleteContactDialog {
  readonly root: Locator
  readonly description: Locator
  readonly confirmButton: Locator
  readonly cancelButton: Locator
  readonly closeButton: Locator

  constructor(page: Page) {
    this.root = page
      .getByRole('dialog')
      .filter({ hasText: 'Delete this contact?' })
    this.description = this.root.getByText(
      'This contact will be permanently deleted from this account.'
    )
    this.confirmButton = this.root.getByRole('button', { name: 'Delete' })
    this.cancelButton = this.root.getByRole('button', { name: 'Cancel' })
    this.closeButton = this.root.getByRole('button', { name: 'Close' })
  }
}

/**
 * "Delete this address book?" (own book, sidebar "⋮" > Delete) or "Remove this address book?"
 * (book of another user, sidebar "⋮" > Remove from my list)
 */
export class DeleteAddressBookDialog {
  readonly root: Locator
  readonly confirmButton: Locator
  readonly cancelButton: Locator
  readonly closeButton: Locator

  constructor(page: Page, mode: 'Delete' | 'Remove') {
    this.root = page
      .getByRole('dialog')
      .filter({ hasText: `${mode} this address book?` })
    this.confirmButton = this.root.getByRole('button', {
      name: mode,
      exact: true
    })
    this.cancelButton = this.root.getByRole('button', { name: 'Cancel' })
    this.closeButton = this.root.getByRole('button', { name: 'Close' })
  }
}

/** "New address book", the "+" right of "My contacts" */
export class NewAddressBookDialog {
  readonly root: Locator
  readonly nameInput: Locator
  readonly createButton: Locator
  readonly cancelButton: Locator
  readonly closeButton: Locator

  constructor(page: Page) {
    this.root = page.getByRole('dialog').filter({ hasText: 'New address book' })
    this.nameInput = this.root.getByPlaceholder('Address book name')
    this.createButton = this.root.getByRole('button', { name: 'Create' })
    this.cancelButton = this.root.getByRole('button', { name: 'Cancel' })
    this.closeButton = this.root.getByRole('button', { name: 'Close' })
  }
}

/** "Share <book>", sidebar "⋮" > Share */
export class ShareDialog {
  readonly page: Page
  readonly root: Locator
  readonly title: Locator
  readonly userInput: Locator
  /** Role of the users to invite, right of the field: "Viewer" or "Editor" */
  readonly inviteRole: Locator
  readonly sendButton: Locator
  readonly closeButton: Locator
  readonly emptyMembers: Locator

  constructor(page: Page) {
    this.page = page
    this.root = page.getByRole('dialog').filter({ hasText: 'Invite people' })
    this.title = this.root.getByRole('heading').first()
    this.userInput = this.root.getByPlaceholder('Add contacts')
    this.inviteRole = this.root.getByRole('combobox').nth(1)
    this.sendButton = this.root.getByRole('button', { name: 'Send' })
    this.closeButton = this.root.getByRole('button', { name: 'Close' })
    this.emptyMembers = this.root.getByText('No one has been added yet')
  }

  /** The row of a member, by name or email */
  member(text: string): Locator {
    return this.root.getByRole('listitem').filter({ hasText: text })
  }

  /** Types in "Add contacts" and picks the suggestion of this user */
  async pick(query: string, email: string): Promise<void> {
    await this.userInput.fill(query)
    await this.page.getByRole('option').filter({ hasText: email }).click()
  }

  async chooseInviteRole(role: 'Viewer' | 'Editor'): Promise<void> {
    await this.inviteRole.click()
    await this.page.getByRole('option', { name: role, exact: true }).click()
  }

  /** Invites a user with a role and waits for their member row */
  async invite(
    query: string,
    email: string,
    role: 'Viewer' | 'Editor'
  ): Promise<void> {
    await this.pick(query, email)
    await this.chooseInviteRole(role)
    await this.sendButton.click()
    await expect(this.member(email)).toBeVisible()
  }
}

/** "Add a shared address book", the "+" of the "Shared" caption */
export class AddSharedBookDialog {
  readonly page: Page
  readonly root: Locator
  readonly userInput: Locator
  readonly addButton: Locator
  readonly cancelButton: Locator
  readonly closeButton: Locator

  constructor(page: Page) {
    this.page = page
    this.root = page
      .getByRole('dialog')
      .filter({ hasText: 'Add a shared address book' })
    this.userInput = this.root.getByPlaceholder('Search for a user')
    this.addButton = this.root.getByRole('button', { name: 'Add', exact: true })
    this.cancelButton = this.root.getByRole('button', { name: 'Cancel' })
    this.closeButton = this.root
      .getByRole('heading')
      .getByRole('button', { name: 'Close' })
  }

  /** A book offered for the picked user, by name */
  book(name: string): Locator {
    return this.root
      .getByRole('listitem')
      .filter({ has: this.page.getByText(name, { exact: true }) })
  }

  /** Types in the user field and picks the suggestion of this user */
  async pickUser(query: string, email: string): Promise<void> {
    await this.userInput.fill(query)
    await this.page.getByRole('option').filter({ hasText: email }).click()
  }
}
