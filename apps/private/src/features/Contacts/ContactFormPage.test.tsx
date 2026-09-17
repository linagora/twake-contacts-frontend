import { fireEvent, render, screen } from '@testing-library/react'
import { Provider } from 'react-redux'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import I18n from 'twake-i18n'
import { setupStore } from '@common/app/store'
import { UserState } from '@common/features/User/UserSlice'
import en from '@common/locales/en.json'
import { CreateContactPage } from './CreateContactPage'
import { EditContactPage } from './EditContactPage'

function renderPage(initialEntries: string[]): ReturnType<typeof render> {
  const store = setupStore({
    user: { userData: { openpaasId: 'u1' } } as UserState,
    contacts: {
      addressBooks: {
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
      loading: false,
      error: null
    }
  })

  return render(
    <Provider store={store}>
      <I18n dictRequire={() => en} lang="en">
        <MemoryRouter initialEntries={initialEntries}>
          <Routes>
            <Route path="/contacts/new" element={<CreateContactPage />} />
            <Route
              path="/contacts/:addressBookId/:contactId/edit"
              element={<EditContactPage />}
            />
            <Route path="/contacts/:addressBookId" element={<div>Book</div>} />
            <Route
              path="/contacts/:addressBookId/:contactId"
              element={<div>Contact</div>}
            />
          </Routes>
        </MemoryRouter>
      </I18n>
    </Provider>
  )
}

describe('CreateContactPage', () => {
  it('renders with empty form', () => {
    renderPage(['/contacts/new'])

    expect(screen.getByText('New contact')).toBeInTheDocument()
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

  it('adds phone entries', () => {
    renderPage(['/contacts/new'])

    fireEvent.change(screen.getByLabelText('First name'), {
      target: { value: 'Bob' }
    })
    fireEvent.click(screen.getByRole('button', { name: 'Add' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Add phone' }))

    expect(screen.getAllByLabelText('Phone')).toHaveLength(2)
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

  it('shows not found for missing contact', () => {
    renderPage(['/contacts/book1/missing/edit'])

    expect(screen.getByText('Contact not found')).toBeInTheDocument()
  })
})
