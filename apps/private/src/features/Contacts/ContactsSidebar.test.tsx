import { setupStore } from '@common/app/store'
import { DEFAULT_ADDRESS_BOOK_ID } from '@common/features/Contacts/constants'
import { AddressBookWithContacts } from '@common/features/Contacts/contactsTypes'
import { UserState } from '@common/features/User/UserSlice'
import en from '@common/locales/en.json'
import { TwakeMuiThemeProvider } from '@linagora/twake-mui'
import { render, screen } from '@testing-library/react'
import { Provider } from 'react-redux'
import { MemoryRouter, Route, Routes } from 'react-router'
import I18n from 'twake-i18n'
import { ContactsSidebar } from './ContactsSidebar'

const makeBook = (id: string, name: string): AddressBookWithContacts => ({
  id,
  userId: 'u1',
  name,
  contactsCount: 0,
  acl: [],
  canWrite: true,
  contacts: [],
  offset: 0,
  hasMore: false
})

function renderSidebar(
  path: string,
  addressBooks?: Record<string, AddressBookWithContacts>
): ReturnType<typeof render> {
  const store = setupStore({
    user: { userData: { openpaasId: 'u1' } } as UserState,
    contacts: {
      addressBooks: addressBooks ?? {
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
          contactsCount: 0,
          acl: [],
          canWrite: true,
          contacts: []
        },
        book2: {
          id: 'book2',
          userId: 'u1',
          name: 'Book 2',
          contactsCount: 0,
          acl: [],
          canWrite: false,
          contacts: []
        }
      },
      loading: false,
      error: null
    }
  })

  return render(
    <Provider store={store}>
      <TwakeMuiThemeProvider>
        <I18n dictRequire={() => en} lang="en">
          <MemoryRouter initialEntries={[path]}>
            <Routes>
              <Route path="/contacts" element={<ContactsSidebar />}>
                <Route path=":addressBookId" element={<div />} />
              </Route>
            </Routes>
          </MemoryRouter>
        </I18n>
      </TwakeMuiThemeProvider>
    </Provider>
  )
}

describe('ContactsSidebar', () => {
  it('links create button to /contacts/new when no address book is selected', () => {
    renderSidebar('/contacts')

    expect(screen.getByText('Create').closest('a')).toHaveAttribute(
      'href',
      '/contacts/new'
    )
  })

  it('links create button to /contacts/:id/new for writable address books', () => {
    renderSidebar('/contacts/book1')

    expect(screen.getByText('Create').closest('a')).toHaveAttribute(
      'href',
      '/contacts/book1/new'
    )
  })

  it('links create button to /contacts/new for read-only address books', () => {
    renderSidebar('/contacts/book2')

    expect(screen.getByText('Create').closest('a')).toHaveAttribute(
      'href',
      '/contacts/new'
    )
  })

  it('lists address books in alphabetical order after My contacts', () => {
    renderSidebar(
      '/contacts',
      Object.fromEntries(
        [
          makeBook(DEFAULT_ADDRESS_BOOK_ID, 'My contacts'),
          makeBook('collected', 'Collected'),
          makeBook('b1', 'zeta'),
          makeBook('b2', '10 Team'),
          makeBook('b3', 'Alpha'),
          makeBook('b4', 'beta'),
          makeBook('b5', '2 Team')
        ].map(book => [book.id, book])
      )
    )

    expect(screen.getAllByRole('link').map(link => link.textContent)).toEqual([
      en.contacts.create,
      en.contacts.myContacts,
      '2 Team',
      '10 Team',
      'Alpha',
      'beta',
      'zeta'
    ])
  })
})
