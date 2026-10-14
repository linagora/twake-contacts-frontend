import { act, fireEvent, render, screen } from '@testing-library/react'
import { Provider } from 'react-redux'
import { MemoryRouter, Route, Routes } from 'react-router'
import { VirtuosoMockContext } from '@linagora/twake-mui'
import I18n from 'twake-i18n'
import { AppStore, setupStore } from '@common/app/store'
import {
  fetchAddressBooks,
  fetchContactsPage
} from '@common/features/Contacts/ContactsDao'
import { fetchContacts } from '@common/features/Contacts/ContactsSlice'
import { ALL_CONTACTS_LISTING } from '@common/features/Contacts/constants'
import {
  AddressBookWithContacts,
  Contact,
  ContactListing
} from '@common/features/Contacts/contactsTypes'
import { UserState } from '@common/features/User/UserSlice'
import en from '@common/locales/en.json'
import { AddressBookPage } from './AddressBookPage'

jest.mock('@common/features/Contacts/ContactsDao')

const alice: Contact = { id: 'c1', displayName: 'Alice Roche', emails: [] }
const bob: Contact = { id: 'c2', displayName: 'Bob Martin', emails: [] }

const makeBook = (
  id: string,
  contacts: Contact[],
  ownerId?: string
): AddressBookWithContacts => ({
  id,
  userId: 'u1',
  ownerId,
  name: id,
  contactsCount: null,
  acl: [],
  canWrite: true,
  contacts
})

const makeListing = (
  addressBookId: string,
  contacts: Contact[],
  next: string | null
): ContactListing => ({
  refs: contacts.map(contact => ({ addressBookId, contactId: contact.id })),
  next,
  hasMore: next !== null,
  loadingRequestId: null
})

const renderPage = (
  path: string,
  addressBooks: Record<string, AddressBookWithContacts>,
  listings: Record<string, ContactListing> = {},
  loading = false
): AppStore => {
  const store = setupStore({
    user: { userData: { openpaasId: 'u1' } } as UserState,
    contacts: { addressBooks, listings, loading, error: null }
  })
  render(
    <Provider store={store}>
      <I18n dictRequire={() => en} lang="en">
        <VirtuosoMockContext.Provider
          value={{ viewportHeight: 1000, itemHeight: 50 }}
        >
          <MemoryRouter initialEntries={[path]}>
            <Routes>
              <Route path="/contacts" element={<AddressBookPage />} />
              <Route
                path="/contacts/:addressBookId"
                element={<AddressBookPage />}
              />
            </Routes>
          </MemoryRouter>
        </VirtuosoMockContext.Provider>
      </I18n>
    </Provider>
  )
  return store
}

describe('AddressBookPage lazy loading', () => {
  beforeEach(() => {
    jest.mocked(fetchContactsPage).mockResolvedValue({
      entries: [{ addressBookId: 'book1', contact: bob }],
      next: null
    })
  })

  it('loads the next page from the cursor when the end of the list is reached', async () => {
    renderPage(
      '/contacts/book1',
      { book1: makeBook('book1', [alice]) },
      { book1: makeListing('book1', [alice], 'cursor1') }
    )

    expect(await screen.findByText('Bob Martin')).toBeInTheDocument()
    expect(fetchContactsPage).toHaveBeenCalledWith(
      'u1',
      expect.objectContaining({ id: 'book1' }),
      'cursor1',
      false
    )
  })

  it('loads the first page again when the server rejects the cursor', async () => {
    jest
      .mocked(fetchContactsPage)
      .mockRejectedValueOnce({ response: { status: 400 }, message: 'Bad' })
    renderPage(
      '/contacts/book1',
      { book1: makeBook('book1', [alice]) },
      { book1: makeListing('book1', [alice], 'stale') }
    )

    expect(await screen.findByText('Bob Martin')).toBeInTheDocument()
    expect(fetchContactsPage).toHaveBeenLastCalledWith(
      'u1',
      expect.objectContaining({ id: 'book1' }),
      null,
      false
    )
  })

  it('loads the first page of a book with no loaded contacts', async () => {
    renderPage('/contacts/book1', {
      book1: makeBook('book1', []),
      book2: makeBook('book2', [alice])
    })

    expect(await screen.findByText('Bob Martin')).toBeInTheDocument()
    expect(fetchContactsPage).toHaveBeenCalledWith(
      'u1',
      expect.objectContaining({ id: 'book1' }),
      null,
      false
    )
  })

  it('loads the contacts of every address book on My contacts', async () => {
    renderPage('/contacts', { book1: makeBook('book1', []) })

    expect(await screen.findByText('Bob Martin')).toBeInTheDocument()
    expect(fetchContactsPage).toHaveBeenCalledWith('u1', null, null, false)
  })

  it('loads the first page again when the books are loaded again meanwhile', async () => {
    type Books = Awaited<ReturnType<typeof fetchAddressBooks>>
    let resolveSecondLoad: (books: Books) => void = () => undefined
    jest
      .mocked(fetchAddressBooks)
      .mockResolvedValueOnce([makeBook('book1', [])])
      .mockReturnValueOnce(
        new Promise<Books>(resolve => (resolveSecondLoad = resolve))
      )
    jest
      .mocked(fetchContactsPage)
      .mockImplementationOnce(() => new Promise(() => undefined))
    const store = renderPage('/contacts', {}, {}, true)

    // as when the user id and then the domains are known
    await act(async () => {
      const firstLoad = store.dispatch(fetchContacts({ userId: 'u1' }))
      void store.dispatch(fetchContacts({ userId: 'u1' }))
      await firstLoad
    })
    expect(fetchContactsPage).toHaveBeenCalledTimes(1)

    await act(async () => {
      resolveSecondLoad([makeBook('book1', [])])
      await Promise.resolve()
    })

    expect(await screen.findByText('Bob Martin')).toBeInTheDocument()
    expect(fetchContactsPage).toHaveBeenCalledTimes(2)
  })

  it('loads the next shared book once the previous one is complete', async () => {
    jest.mocked(fetchContactsPage).mockResolvedValue({
      entries: [{ addressBookId: 'shared2', contact: bob }],
      next: null
    })
    renderPage(
      '/contacts',
      {
        shared1: makeBook('shared1', [alice], 'owner'),
        shared2: makeBook('shared2', [], 'owner')
      },
      {
        [ALL_CONTACTS_LISTING]: makeListing('shared1', [alice], null),
        shared1: makeListing('shared1', [alice], null)
      }
    )

    fireEvent.click(screen.getByRole('tab', { name: en.contacts.tabs.shared }))

    expect(await screen.findByText('Bob Martin')).toBeInTheDocument()
    expect(screen.queryByText('Alice Roche')).toBeInTheDocument()
    expect(fetchContactsPage).toHaveBeenCalledWith(
      'u1',
      expect.objectContaining({ id: 'shared2' }),
      null,
      false
    )
  })
})
