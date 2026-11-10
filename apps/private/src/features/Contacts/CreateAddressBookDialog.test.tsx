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
          onClose={vi.fn()}
          onConfirm={onConfirm}
        />
      </I18n>
    </TwakeMuiThemeProvider>
  )

const nameField = (): HTMLElement =>
  screen.getByPlaceholderText(en.contacts.addressBook.namePlaceholder)

describe('CreateAddressBookDialog', () => {
  it('names the dialog after its title only, with the close button outside the heading', () => {
    renderDialog(vi.fn())

    const heading = screen.getByRole('heading', {
      name: en.contacts.addressBook.createTitle
    })
    const closeButton = screen.getByRole('button', { name: 'Close' })

    expect(
      screen.getByRole('dialog', { name: en.contacts.addressBook.createTitle })
    ).toBeInTheDocument()
    expect(heading).not.toContainElement(closeButton)
    expect(heading.querySelector('li')).toBeNull()
  })

  it('creates the address book when pressing Enter in the name field', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    renderDialog(onConfirm)

    await user.type(nameField(), '  EnterTest {Enter}')

    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(onConfirm).toHaveBeenCalledWith('EnterTest')
  })

  it('creates the address book when clicking Create', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    renderDialog(onConfirm)

    await user.type(nameField(), 'ClickTest')
    await user.click(
      screen.getByRole('button', { name: en.contacts.addressBook.save })
    )

    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(onConfirm).toHaveBeenCalledWith('ClickTest')
  })

  it('does not create the address book when pressing Enter with a blank name', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    renderDialog(onConfirm)

    await user.type(nameField(), '   {Enter}')

    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('does not create the address book again while it is being created', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    renderDialog(onConfirm, true)

    await user.type(nameField(), 'Pending{Enter}')

    expect(onConfirm).not.toHaveBeenCalled()
  })
})
