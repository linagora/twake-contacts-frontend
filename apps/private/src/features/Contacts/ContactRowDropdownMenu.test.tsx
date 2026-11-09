import { render, screen } from '@testing-library/react'
import { Provider } from 'react-redux'
import { TwakeMuiThemeProvider } from '@linagora/twake-mui'
import I18n from 'twake-i18n'
import { setupStore } from '@common/app/store'
import { Contact } from '@common/features/Contacts/contactsTypes'
import { UserState } from '@common/features/User/UserSlice'
import en from '@common/locales/en.json'
import { ContactRowDropdownMenu } from './ContactRowDropdownMenu'

const renderMenu = (contact: Contact, readOnly = false): void => {
  const store = setupStore({
    user: { userData: { openpaasId: 'u1' } } as UserState
  })
  render(
    <Provider store={store}>
      <TwakeMuiThemeProvider>
        <I18n dictRequire={() => en} lang="en">
          <ContactRowDropdownMenu
            contact={contact}
            anchorEl={document.body}
            onClose={vi.fn()}
            onOpenDeleteDialog={vi.fn()}
            onOpenCopyDialog={vi.fn()}
            onOpenMoveDialog={vi.fn()}
            readOnly={readOnly}
          />
        </I18n>
      </TwakeMuiThemeProvider>
    </Provider>
  )
}

describe('ContactRowDropdownMenu', () => {
  it('disables email based actions when the contact has no email', () => {
    renderMenu({ id: 'c1', displayName: 'Bob Added', emails: [] })

    expect(
      screen.getByRole('menuitem', { name: 'Send email' })
    ).toHaveAttribute('aria-disabled', 'true')
    expect(
      screen.getByRole('menuitem', { name: 'Create event' })
    ).toHaveAttribute('aria-disabled', 'true')
  })

  it('enables email based actions when the contact has an email', () => {
    renderMenu({
      id: 'c1',
      displayName: 'Alice Roche',
      emails: [{ type: null, value: 'alice@example.com' }]
    })

    expect(
      screen.getByRole('menuitem', { name: 'Send email' })
    ).not.toHaveAttribute('aria-disabled')
    expect(
      screen.getByRole('menuitem', { name: 'Create event' })
    ).not.toHaveAttribute('aria-disabled')
  })
})

it('hides copy and move for read-only contacts', () => {
  renderMenu({ id: 'c1', displayName: 'Alice', emails: [] }, true)
  expect(
    screen.queryByRole('menuitem', { name: 'Copy contact' })
  ).not.toBeInTheDocument()
  expect(
    screen.queryByRole('menuitem', { name: 'Move contact' })
  ).not.toBeInTheDocument()
})

it('offers copy and move for writable contacts', () => {
  renderMenu({ id: 'c1', displayName: 'Alice', emails: [] })
  expect(
    screen.getByRole('menuitem', { name: 'Copy contact' })
  ).toBeInTheDocument()
  expect(
    screen.getByRole('menuitem', { name: 'Move contact' })
  ).toBeInTheDocument()
})
