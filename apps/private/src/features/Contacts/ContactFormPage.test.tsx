import { setupStore } from '@common/app/store'
import {
  DEFAULT_ADDRESS_BOOK_ID,
  DEFAULT_CONTACT_SORT
} from '@common/features/Contacts/constants'
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

vi.mock('@common/features/Contacts/ContactsDao')

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
        },
        alphaShared: {
          id: 'alphaShared',
          userId: 'u1',
          ownerId: 'u2',
          ownerDisplayName: 'Bob Owner',
          name: 'Alpha Shared',
          contactsCount: null,
          acl: [],
          canWrite: true,
          contacts: []
        },
        readOnlyShared: {
          id: 'readOnlyShared',
          userId: 'u1',
          ownerId: 'u2',
          ownerDisplayName: 'Bob Owner',
          name: 'Read Only Shared',
          contactsCount: null,
          acl: [],
          canWrite: false,
          contacts: []
        },
        dab: {
          id: 'dab',
          userId: 'u1',
          ownerId: 'domain1',
          name: 'Domain members',
          contactsCount: null,
          acl: [],
          canWrite: true,
          contacts: []
        }
      },
      listings: {},
      sort: DEFAULT_CONTACT_SORT,
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

  it('shows a visible label on the address book field and no move hint', () => {
    renderPage(['/contacts/book1/new'])

    const addressBookSelect = screen.getByRole('combobox', {
      name: 'Address book'
    })
    const labelId = addressBookSelect.getAttribute('aria-labelledby') ?? ''
    expect(document.getElementById(labelId)).toHaveTextContent('Address book')

    fireEvent.mouseDown(addressBookSelect)
    fireEvent.click(screen.getByRole('option', { name: 'Book 2' }))

    expect(screen.queryByText(/Saving will move this contact/)).toBeNull()
  })

  it('lists own, then writable shared address books, without the domain book', () => {
    renderPage(['/contacts/new'])

    fireEvent.mouseDown(screen.getByLabelText('Address book'))
    const listbox = within(screen.getByRole('listbox'))

    expect(
      listbox.getAllByRole('option').map(option => option.textContent)
    ).toEqual(['My contacts', 'Book 1', 'Book 2', 'Alpha SharedBob Owner'])
  })

  it('exposes the shared caption as a presentation element, not an option', () => {
    renderPage(['/contacts/new'])

    fireEvent.mouseDown(screen.getByLabelText('Address book'))
    const caption = within(screen.getByRole('listbox')).getByText('Shared')

    expect(caption).toHaveAttribute('role', 'presentation')
    expect(caption).not.toHaveAttribute('aria-selected')
  })

  it('creates the contact only once when Save is clicked twice', async () => {
    let resolveSave: () => void = () => undefined
    vi.mocked(saveContact).mockReset()
    vi.mocked(saveContact).mockImplementation(
      () => new Promise<void>(resolve => (resolveSave = resolve))
    )
    renderPage(['/contacts/book1/new'])

    fireEvent.change(screen.getByLabelText('First name'), {
      target: { value: 'Dbl' }
    })
    const saveButton = screen.getByRole('button', { name: 'Save' })
    fireEvent.click(saveButton)
    fireEvent.click(saveButton)

    expect(saveButton).toBeDisabled()
    expect(saveContact).toHaveBeenCalledTimes(1)

    resolveSave()

    expect(await screen.findByText('Book')).toBeInTheDocument()
    expect(saveContact).toHaveBeenCalledTimes(1)
  })

  it('re-enables Save when the creation fails', async () => {
    vi.mocked(saveContact).mockReset()
    vi.mocked(saveContact).mockRejectedValue(new Error('Server error'))
    renderPage(['/contacts/book1/new'])

    fireEvent.change(screen.getByLabelText('First name'), {
      target: { value: 'Dbl' }
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled()
    })
    expect(saveContact).toHaveBeenCalledTimes(1)
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
    vi.mocked(fetchContact).mockRejectedValue(new Error('Not found'))

    renderPage(['/contacts/book1/missing/edit'])

    expect(await screen.findByText('Contact not found')).toBeInTheDocument()
  })

  it('fetches a contact that is not in the loaded pages of its book', async () => {
    vi.mocked(fetchContact).mockResolvedValue({
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
    vi.mocked(fetchContact).mockRejectedValue(new Error('Not found'))

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

  it('shows no move hint while the address book is unchanged', () => {
    renderPage(['/contacts/book1/c1/edit'])

    expect(screen.queryByText(/Saving will move this contact/)).toBeNull()
  })

  it('warns that saving moves the contact when another book is picked', () => {
    renderPage(['/contacts/book1/c1/edit'])

    fireEvent.mouseDown(screen.getByLabelText('Address book'))
    fireEvent.click(screen.getByRole('option', { name: 'Book 2' }))

    expect(
      screen.getByText('Saving will move this contact to Book 2.')
    ).toBeInTheDocument()

    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Address book' }))
    fireEvent.click(screen.getByRole('option', { name: 'Book 1' }))

    expect(screen.queryByText(/Saving will move this contact/)).toBeNull()
  })

  it('updates the contact and moves it to a different address book', async () => {
    vi.mocked(saveContact).mockResolvedValue()
    vi.mocked(moveContactDao).mockResolvedValue()
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
      { userId: 'u1', addressBookId: 'book1' },
      { userId: 'u1', addressBookId: 'book2' },
      'c1'
    )
  })

  it('navigates to the contact in the new address book after moving', async () => {
    vi.mocked(saveContact).mockResolvedValue()
    vi.mocked(moveContactDao).mockResolvedValue()
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
    vi.mocked(saveContact).mockResolvedValue()
    vi.mocked(moveContactDao).mockResolvedValue()
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
