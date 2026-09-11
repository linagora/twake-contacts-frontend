import { render, screen } from '@testing-library/react'
import { Provider } from 'react-redux'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import I18n from 'twake-i18n'
import { setupStore } from '@common/app/store'
import en from '@common/locales/en.json'
import { AddressBookPage } from './AddressBookPage'
import { ContactPage } from './ContactPage'

const renderContacts = (path: string): ReturnType<typeof render> =>
  render(
    <Provider
      store={setupStore({
        contacts: {
          addressBooks: [],
          loading: false,
          error: null,
          contactsByBook: {
            book2: [{ id: 'c2', displayName: 'Alice Roche', emails: [] }],
            book1: [
              {
                id: 'c1',
                displayName: 'Isabella Martinez',
                emails: [{ type: 'work', value: 'martinez@twake.app' }],
                phones: [{ type: 'cell', value: '+3365024491' }],
                categories: ['Information'],
                addresses: [
                  {
                    type: 'home',
                    address: '',
                    street: '23 Rue de Mogador',
                    postalCode: '75009',
                    locality: 'Paris',
                    country: ''
                  }
                ]
              }
            ]
          }
        }
      })}
    >
      <I18n dictRequire={() => en} lang="en">
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path="/contacts" element={<AddressBookPage />} />
            <Route
              path="/contacts/:addressBookId"
              element={<AddressBookPage />}
            />
            <Route
              path="/contacts/:addressBookId/:contactId"
              element={<ContactPage />}
            />
          </Routes>
        </MemoryRouter>
      </I18n>
    </Provider>
  )

describe('AddressBookPage', () => {
  it('lists contacts from every address book on My contacts', () => {
    renderContacts('/contacts')

    expect(screen.getByText('My contacts')).toBeInTheDocument()
    expect(screen.getByText('Isabella Martinez')).toBeInTheDocument()
    expect(screen.getByText('Alice Roche')).toBeInTheDocument()
  })

  it('lists only the selected address book', () => {
    renderContacts('/contacts/book2')

    expect(screen.getByText('Alice Roche')).toBeInTheDocument()
    expect(screen.queryByText('Isabella Martinez')).toBe(null)
  })
})

describe('ContactPage', () => {
  it('renders the contact details', () => {
    renderContacts('/contacts/book1/c1')

    expect(screen.getAllByText('Isabella Martinez')).toHaveLength(2)
    expect(screen.getByText('martinez@twake.app')).toBeInTheDocument()
    expect(screen.getByText('+3365024491')).toBeInTheDocument()
    expect(screen.getByText('Information')).toBeInTheDocument()
    expect(
      screen.getByText('23 Rue de Mogador, 75009, Paris')
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /back/i })).toHaveAttribute(
      'href',
      '/contacts/book1'
    )
  })

  it('shows a not found message for an unknown contact', () => {
    renderContacts('/contacts/book1/unknown')

    expect(screen.getByText('Contact not found')).toBeInTheDocument()
  })
})
