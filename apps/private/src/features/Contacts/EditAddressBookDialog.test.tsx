import { classifyAddressBook } from '@common/features/Contacts/addressBookModel'
import { render, RenderResult, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TwakeMuiThemeProvider } from '@linagora/twake-mui'
import I18n from 'twake-i18n'
import en from '@common/locales/en.json'
import { AddressBook } from '@common/features/Contacts/contactsTypes'
import { EditAddressBookDialog } from './EditAddressBookDialog'

const book: AddressBook = classifyAddressBook(
  {
    id: 'team',
    userId: 'alice',
    name: 'Team',
    contactsCount: 0,
    acl: [],
    canWrite: true
  },
  'alice'
)

const renderDialog = (
  onConfirm: (values: { name: string }) => void,
  onClose: () => void = vi.fn()
): RenderResult =>
  render(
    <TwakeMuiThemeProvider>
      <I18n dictRequire={() => en} lang="en">
        <EditAddressBookDialog
          book={book}
          onClose={onClose}
          onConfirm={onConfirm}
        />
      </I18n>
    </TwakeMuiThemeProvider>
  )

const nameField = (): HTMLElement =>
  screen.getByRole('textbox', { name: en.contacts.edit.name })

describe('EditAddressBookDialog', () => {
  it('saves the address book when pressing Enter in the name field', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    renderDialog(onConfirm)

    await user.clear(nameField())
    await user.type(nameField(), '  Team QA {Enter}')

    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(onConfirm).toHaveBeenCalledWith({ name: 'Team QA' })
  })

  it('saves the address book when clicking Save', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    renderDialog(onConfirm)

    await user.type(nameField(), ' QA')
    await user.click(
      screen.getByRole('button', { name: en.contacts.edit.save })
    )

    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(onConfirm).toHaveBeenCalledWith({ name: 'Team QA' })
  })

  it('does not save the address book when pressing Enter with a blank name', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    renderDialog(onConfirm)

    await user.clear(nameField())
    await user.type(nameField(), '   {Enter}')

    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('closes the dialog from the close button of the title bar', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    const onClose = vi.fn()
    renderDialog(onConfirm, onClose)

    await user.click(
      screen.getByRole('button', { name: en.contacts.form.close })
    )

    expect(onClose).toHaveBeenCalledTimes(1)
    expect(onConfirm).not.toHaveBeenCalled()
  })
})
