import { render, RenderResult, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TwakeMuiThemeProvider } from '@linagora/twake-mui'
import I18n from 'twake-i18n'
import en from '@common/locales/en.json'
import { CreateAddressBookDialog } from './CreateAddressBookDialog'

const renderDialog = (
  onConfirm: (name: string) => void,
  isCreating = false
): RenderResult =>
  render(
    <TwakeMuiThemeProvider>
      <I18n dictRequire={() => en} lang="en">
        <CreateAddressBookDialog
          isCreating={isCreating}
          onClose={jest.fn()}
          onConfirm={onConfirm}
        />
      </I18n>
    </TwakeMuiThemeProvider>
  )

const nameField = (): HTMLElement =>
  screen.getByPlaceholderText(en.contacts.addressBook.namePlaceholder)

describe('CreateAddressBookDialog', () => {
  it('creates the address book when pressing Enter in the name field', () => {
    const onConfirm = jest.fn()
    renderDialog(onConfirm)

    userEvent.type(nameField(), '  EnterTest {enter}')

    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(onConfirm).toHaveBeenCalledWith('EnterTest')
  })

  it('creates the address book when clicking Create', () => {
    const onConfirm = jest.fn()
    renderDialog(onConfirm)

    userEvent.type(nameField(), 'ClickTest')
    userEvent.click(
      screen.getByRole('button', { name: en.contacts.addressBook.save })
    )

    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(onConfirm).toHaveBeenCalledWith('ClickTest')
  })

  it('does not create the address book when pressing Enter with a blank name', () => {
    const onConfirm = jest.fn()
    renderDialog(onConfirm)

    userEvent.type(nameField(), '   {enter}')

    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('does not create the address book again while it is being created', () => {
    const onConfirm = jest.fn()
    renderDialog(onConfirm, true)

    userEvent.type(nameField(), 'Pending{enter}')

    expect(onConfirm).not.toHaveBeenCalled()
  })
})
