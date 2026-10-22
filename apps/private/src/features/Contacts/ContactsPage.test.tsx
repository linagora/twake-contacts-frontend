import { setupStore } from '@common/app/store'
import {
  DEFAULT_ADDRESS_BOOK_ID,
  DEFAULT_CONTACT_SORT
} from '@common/features/Contacts/constants'
import { UserState } from '@common/features/User/UserSlice'
import en from '@common/locales/en.json'
import fr from '@common/locales/fr.json'
import { TwakeMuiThemeProvider } from '@linagora/twake-mui'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { Provider } from 'react-redux'
import { Link, MemoryRouter, Route, Routes } from 'react-router'
import I18n from 'twake-i18n'
import { ContactsPage } from './ContactsPage'
import {
  deleteAddressBook,
  updateAddressBook
} from '@common/features/Contacts/ContactsSlice'
import { AddressBookWithContacts } from '@common/features/Contacts/contactsTypes'

import * as ContactsDao from '@common/features/Contacts/ContactsDao'

jest.mock('@common/features/Contacts/ContactsDao')

const mockDeleteAddressBook = jest.mocked(ContactsDao.deleteAddressBook)
const mockUpdateAddressBook = jest.mocked(ContactsDao.updateAddressBook)

const failUpdate = (store: ReturnType<typeof setupStore>): void => {
  act(() => {
    store.dispatch({
      type: 'contacts/updateContact/rejected',
      payload: { status: 403 },
      error: {}
    })
  })
}

function renderPage(
  locale: { lang: string; dict: typeof en } = { lang: 'en', dict: en },
  book1Overrides: Partial<AddressBookWithContacts> = {}
): ReturnType<typeof setupStore> {
  const store = setupStore({
    user: { userData: {} } as UserState,
    contacts: {
      addressBooks: {
        [DEFAULT_ADDRESS_BOOK_ID]: {
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
          contacts: [],
          ...book1Overrides
        }
      },
      listings: {},
      sort: DEFAULT_CONTACT_SORT,
      loading: false,
      error: null
    }
  })

  render(
    <Provider store={store}>
      <TwakeMuiThemeProvider>
        <I18n dictRequire={() => locale.dict} lang={locale.lang}>
          <MemoryRouter initialEntries={['/contacts']}>
            <Routes>
              <Route path="/contacts" element={<ContactsPage />}>
                <Route
                  index
                  element={<Link to="/contacts/book1">Open address book</Link>}
                />
                <Route
                  path=":addressBookId"
                  element={<div>Address book page</div>}
                />
              </Route>
            </Routes>
          </MemoryRouter>
        </I18n>
      </TwakeMuiThemeProvider>
    </Provider>
  )
  return store
}

describe('ContactsPage error banner', () => {
  it('clears the error when navigating to another page', () => {
    const store = renderPage()
    failUpdate(store)
    expect(screen.getByRole('alert')).toHaveTextContent(
      en.contacts.errors.forbidden
    )

    fireEvent.click(screen.getByRole('link', { name: 'Open address book' }))

    expect(screen.getByText('Address book page')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(store.getState().contacts.error).toBeNull()
  })

  it('clears the error when the banner is closed', () => {
    const store = renderPage()
    failUpdate(store)

    fireEvent.click(screen.getByRole('button', { name: /close/i }))

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(store.getState().contacts.error).toBeNull()
  })

  it('labels the banner close button in the user language', () => {
    const store = renderPage({ lang: 'fr', dict: fr })
    failUpdate(store)

    expect(
      screen.getByRole('button', { name: fr.contacts.form.close })
    ).toBeInTheDocument()
  })
})

describe('ContactsPage address book success toast', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('confirms an address book rename once it succeeded', async () => {
    mockUpdateAddressBook.mockResolvedValue(undefined)
    const store = renderPage()

    await act(async () => {
      await store.dispatch(
        updateAddressBook({
          userId: 'u1',
          addressBookId: 'book1',
          name: 'Renamed'
        })
      )
    })

    expect(screen.getByRole('alert')).toHaveTextContent(
      en.contacts.addressBook.updateSuccess
    )
  })

  it('confirms the deletion of an own address book', async () => {
    mockDeleteAddressBook.mockResolvedValue(undefined)
    const store = renderPage()

    await act(async () => {
      await store.dispatch(
        deleteAddressBook({ userId: 'u1', addressBookId: 'book1' })
      )
    })

    expect(mockDeleteAddressBook).toHaveBeenCalledWith('u1', 'book1')
    expect(screen.getByRole('alert')).toHaveTextContent(
      en.contacts.addressBook.deleteSuccess
    )
  })

  it('confirms the removal of a shared address book from the list', async () => {
    mockDeleteAddressBook.mockResolvedValue(undefined)
    const store = renderPage({ lang: 'fr', dict: fr }, { ownerId: 'u2' })

    await act(async () => {
      await store.dispatch(
        deleteAddressBook({ userId: 'u1', addressBookId: 'book1' })
      )
    })

    expect(screen.getByRole('alert')).toHaveTextContent(
      fr.contacts.addressBook.removeSuccess
    )
  })

  it('shows no success toast when the action failed', async () => {
    mockDeleteAddressBook.mockRejectedValue(new Error('boom'))
    const store = renderPage()

    await act(async () => {
      await store.dispatch(
        deleteAddressBook({ userId: 'u1', addressBookId: 'book1' })
      )
    })

    expect(store.getState().contacts.addressBookSuccess).toBeUndefined()
    expect(
      screen.queryByText(en.contacts.addressBook.deleteSuccess)
    ).not.toBeInTheDocument()
  })

  it('clears the toast when it is closed', async () => {
    mockUpdateAddressBook.mockResolvedValue(undefined)
    const store = renderPage()

    await act(async () => {
      await store.dispatch(
        updateAddressBook({
          userId: 'u1',
          addressBookId: 'book1',
          name: 'Renamed'
        })
      )
    })
    fireEvent.click(screen.getByRole('button', { name: /close/i }))

    expect(store.getState().contacts.addressBookSuccess).toBeNull()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
