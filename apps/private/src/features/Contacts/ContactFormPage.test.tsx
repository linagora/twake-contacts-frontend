import { setupStore } from '@common/app/store'
import { DEFAULT_ADDRESS_BOOK_ID } from '@common/features/Contacts/constants'
import {
  fetchContact,
  moveContact as moveContactDao,
  saveContact
} from '@common/features/Contacts/ContactsDao'
import { UserState } from '@common/features/User/UserSlice'
import en from '@common/locales/en.json'
import { TwakeMuiThemeProvider } from '@linagora/twake-mui'
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within
} from '@testing-library/react'
import { Provider } from 'react-redux'
import { MemoryRouter, Route, Routes } from 'react-router'
import I18n from 'twake-i18n'
import { CreateContactPage } from './CreateContactPage'
import { EditContactPage } from './EditContactPage'

jest.mock('@common/features/Contacts/ContactsDao')

function renderPage(initialEntries: string[]): ReturnType<typeof render> {
  const store = setupStore({
    user: { userData: { openpaasId: 'u1' } } as UserState,
    contacts: {
      addressBooks: {
        contacts: {
          id: DEFAULT_ADDRESS_BOOK_ID,
          userId: 'u1',
          name: 'My contacts',
          contactsCount: 0,
          acl: [],
          canWrite: true,
          contacts: []
        },
        book1: {
          id: 'book1',
          userId: 'u1',
          name: 'Book 1',
          contactsCount: 1,
          acl: [],
          canWrite: true,
          contacts: [
            {
              id: 'c1',
              displayName: 'Alice Roche',
              name: { givenName: 'Alice', familyName: 'Roche' },
              emails: [{ type: 'work', value: 'alice@example.com' }],
              phones: [],
              categories: ['Team A'],
              addresses: [],
              socialProfiles: []
            }
          ]
        },
        book2: {
          id: 'book2',
          userId: 'u1',
          name: 'Book 2',
          contactsCount: 0,
          acl: [],
          canWrite: true,
          contacts: []
        }
      },
      listings: {},
      loading: false,
      error: null
    }
  })

  return render(
    <Provider store={store}>
      <TwakeMuiThemeProvider>
        <I18n dictRequire={() => en} lang="en">
          <MemoryRouter initialEntries={initialEntries}>
            <Routes>
              <Route path="/contacts/new" element={<CreateContactPage />} />
              <Route
                path="/contacts/:addressBookId/new"
                element={<CreateContactPage />}
              />
              <Route
                path="/contacts/:addressBookId/:contactId/edit"
                element={<EditContactPage />}
              />
              <Route
                path="/contacts/:addressBookId"
                element={<div>Book</div>}
              />
              <Route
                path="/contacts/:addressBookId/:contactId"
                element={<div>Contact</div>}
              />
            </Routes>
          </MemoryRouter>
        </I18n>
      </TwakeMuiThemeProvider>
    </Provider>
  )
}

describe('CreateContactPage', () => {
  it('renders with empty form', () => {
    renderPage(['/contacts/new'])

    expect(screen.getByText('Create contact')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
    expect(screen.getByLabelText('First name')).toHaveValue('')
    expect(screen.getByLabelText('Last name')).toHaveValue('')
  })

  it('enables save when a name is entered', () => {
    renderPage(['/contacts/new'])

    fireEvent.change(screen.getByLabelText('First name'), {
      target: { value: 'Bob' }
    })

    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled()
  })

  it('keeps the title when names contain only spaces', () => {
    renderPage(['/contacts/new'])

    fireEvent.change(screen.getByLabelText('First name'), {
      target: { value: '   ' }
    })
    fireEvent.change(screen.getByLabelText('Last name'), {
      target: { value: '  ' }
    })

    expect(screen.getByText('Create contact')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
  })

  it('shows the trimmed name as title', () => {
    renderPage(['/contacts/new'])

    fireEvent.change(screen.getByLabelText('First name'), {
      target: { value: ' Bob ' }
    })
    fireEvent.change(screen.getByLabelText('Last name'), {
      target: { value: '  ' }
    })

    expect(screen.getByText('Bob')).toBeInTheDocument()
    expect(screen.queryByText('Create contact')).not.toBeInTheDocument()
  })

  it('adds phone entries', () => {
    renderPage(['/contacts/new'])

    fireEvent.change(screen.getByLabelText('First name'), {
      target: { value: 'Bob' }
    })
    fireEvent.click(screen.getByRole('button', { name: 'Add' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Add phone' }))

    expect(screen.getAllByLabelText('Phone')).toHaveLength(2)
  })

  it('gives the type selector room for long translated placeholders', () => {
    renderPage(['/contacts/new'])

    const typeSelector = screen.getAllByRole('combobox', { name: 'Type' })[0]

    expect(typeSelector.closest('.MuiGrid-grid-xs-3')).not.toBeNull()
  })

  it('adds email entries', () => {
    renderPage(['/contacts/new'])

    fireEvent.change(screen.getByLabelText('First name'), {
      target: { value: 'Bob' }
    })
    fireEvent.click(screen.getByRole('button', { name: 'Add' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Add email' }))

    expect(screen.getAllByLabelText('Email')).toHaveLength(2)
  })

  it('adds address entries', () => {
    renderPage(['/contacts/new'])

    fireEvent.change(screen.getByLabelText('First name'), {
      target: { value: 'Bob' }
    })
    fireEvent.click(screen.getByRole('button', { name: 'Add' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Add address' }))

    expect(screen.getAllByLabelText('Address')).toHaveLength(2)
  })

  it('preselects address book from URL param', () => {
    renderPage(['/contacts/book1/new'])

    const addressBookSelect = screen.getByLabelText('Address book')
    expect(addressBookSelect).toHaveTextContent('Book 1')
  })

  it('links back to main page for hidden address books', () => {
    renderPage(['/contacts/contacts/new'])

    expect(screen.getByRole('link', { name: /back/i })).toHaveAttribute(
      'href',
      '/contacts'
    )
  })
})

describe('EditContactPage', () => {
  it('renders pre-filled with contact data', () => {
    renderPage(['/contacts/book1/c1/edit'])

    expect(screen.getByLabelText('First name')).toHaveValue('Alice')
    expect(screen.getByLabelText('Last name')).toHaveValue('Roche')
    expect(screen.getByLabelText('Email')).toHaveValue('alice@example.com')

    const addressBookSelect = screen.getByLabelText('Address book')
    expect(addressBookSelect).toHaveTextContent('Book 1')
  })

  it('navigates back on back button', () => {
    renderPage(['/contacts/book1', '/contacts/book1/c1/edit'])

    fireEvent.click(screen.getByRole('link', { name: /back/i }))

    expect(screen.getByText('Contact')).toBeInTheDocument()
  })

  it('shows the contact card in the delete dialog', () => {
    renderPage(['/contacts/book1/c1/edit'])

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))

    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText('Delete this contact?')).toBeInTheDocument()
    expect(within(dialog).getByText('AR')).toBeInTheDocument()
    expect(within(dialog).getByText('Alice Roche')).toBeInTheDocument()
    expect(within(dialog).getByText('alice@example.com')).toBeInTheDocument()
    expect(
      within(dialog).getByRole('button', { name: 'Close' })
    ).toBeInTheDocument()
  })

  it('shows not found for missing contact', async () => {
    jest.mocked(fetchContact).mockRejectedValue(new Error('Not found'))

    renderPage(['/contacts/book1/missing/edit'])

    expect(await screen.findByText('Contact not found')).toBeInTheDocument()
  })

  it('fetches a contact that is not in the loaded pages of its book', async () => {
    jest.mocked(fetchContact).mockResolvedValue({
      id: 'c60',
      displayName: 'Search Own',
      name: { givenName: 'Search', familyName: 'Own' },
      emails: []
    })

    renderPage(['/contacts/book1/c60/edit'])

    expect(await screen.findByLabelText('First name')).toHaveValue('Search')
    expect(screen.getByLabelText('Last name')).toHaveValue('Own')
  })

  it('links back to main page for hidden address books when contact not found', async () => {
    jest.mocked(fetchContact).mockRejectedValue(new Error('Not found'))

    renderPage(['/contacts/contacts/missing/edit'])

    expect(await screen.findByRole('link', { name: /back/i })).toHaveAttribute(
      'href',
      '/contacts'
    )
  })

  it('allows changing the address book during edit', () => {
    renderPage(['/contacts/book1/c1/edit'])

    const addressBookSelect = screen.getByLabelText('Address book')
    expect(addressBookSelect).not.toBeDisabled()
  })

  it('updates the contact and moves it to a different address book', async () => {
    jest.mocked(saveContact).mockResolvedValue()
    jest.mocked(moveContactDao).mockResolvedValue()
    renderPage(['/contacts/book1/c1/edit'])

    fireEvent.change(screen.getByLabelText('First name'), {
      target: { value: 'Alice Updated' }
    })

    const addressBookSelect = screen.getByLabelText('Address book')
    fireEvent.mouseDown(addressBookSelect)
    fireEvent.click(screen.getByRole('option', { name: 'Book 2' }))

    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(screen.getByText('Contact')).toBeInTheDocument()
    })

    expect(saveContact).toHaveBeenCalledWith(
      'u1',
      'book1',
      expect.objectContaining({
        id: 'c1',
        displayName: 'Alice Updated Roche'
      })
    )
    expect(moveContactDao).toHaveBeenCalledWith(
      'u1',
      'book1',
      'book2',
      expect.objectContaining({
        id: 'c1',
        displayName: 'Alice Updated Roche'
      })
    )
  })

  it('navigates to the contact in the new address book after moving', async () => {
    jest.mocked(saveContact).mockResolvedValue()
    jest.mocked(moveContactDao).mockResolvedValue()
    renderPage(['/contacts/book1/c1/edit'])

    const addressBookSelect = screen.getByLabelText('Address book')
    fireEvent.mouseDown(addressBookSelect)
    fireEvent.click(screen.getByRole('option', { name: 'Book 2' }))

    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(screen.getByText('Contact')).toBeInTheDocument()
    })
  })

  it('only updates the contact when the address book is unchanged', async () => {
    jest.mocked(saveContact).mockResolvedValue()
    jest.mocked(moveContactDao).mockResolvedValue()
    renderPage(['/contacts/book1/c1/edit'])

    fireEvent.change(screen.getByLabelText('First name'), {
      target: { value: 'Alice Updated' }
    })

    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(screen.getByText('Contact')).toBeInTheDocument()
    })

    expect(saveContact).toHaveBeenCalledTimes(1)
    expect(moveContactDao).not.toHaveBeenCalled()
  })
})
