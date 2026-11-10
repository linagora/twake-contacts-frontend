import { act, fireEvent, render, screen } from '@testing-library/react'
import { Provider } from 'react-redux'
import {
  Link,
  MemoryRouter,
  Route,
  Routes,
  useLocation,
  useNavigate
} from 'react-router'
import { TwakeMuiThemeProvider, VirtuosoMockContext } from '@linagora/twake-mui'
import I18n from 'twake-i18n'
import { AppStore, setupStore } from '@common/app/store'
import {
  fetchAddressBooks,
  fetchContactsPage
} from '@common/features/Contacts/ContactsDao'
import { fetchContacts } from '@common/features/Contacts/ContactsSlice'
import {
  ALL_CONTACTS_LISTING,
  DEFAULT_CONTACT_SORT
} from '@common/features/Contacts/constants'
import {
  AddressBookWithContacts,
  Contact,
  ContactListing
} from '@common/features/Contacts/contactsTypes'
import { UserState } from '@common/features/User/UserSlice'
import en from '@common/locales/en.json'
import { AddressBookPage } from './AddressBookPage'

vi.mock('@common/features/Contacts/ContactsDao')

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
  pages: [{ after: null, refIndex: 0 }],
  next,
  hasMore: next !== null,
  loadingRequestId: null
})

const LocationProbe: React.FC = () => {
  const location = useLocation()
  const navigate = useNavigate()
  return (
    <>
      <output>{`${location.pathname}${location.search}`}</output>
      <button onClick={() => void navigate(-1)}>Go back</button>
    </>
  )
}

const renderPage = (
  path: string,
  addressBooks: Record<string, AddressBookWithContacts>,
  listings: Record<string, ContactListing> = {},
  loading = false
): AppStore => {
  const store = setupStore({
    user: { userData: { openpaasId: 'u1' } } as UserState,
    contacts: {
      addressBooks,
      listings,
      sort: DEFAULT_CONTACT_SORT,
      loading,
      error: null
    }
  })
  render(
    <Provider store={store}>
      <TwakeMuiThemeProvider>
        <I18n dictRequire={() => en} lang="en">
          <VirtuosoMockContext.Provider
            value={{ viewportHeight: 1000, itemHeight: 50 }}
          >
            <MemoryRouter initialEntries={[path]}>
              <Link to="/contacts">Go to My contacts</Link>
              <Link to="/contacts/book1">Go to book1</Link>
              <Link to="/contacts/book2">Go to book2</Link>
              <LocationProbe />
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
      </TwakeMuiThemeProvider>
    </Provider>
  )
  return store
}

describe('AddressBookPage lazy loading', () => {
  beforeEach(() => {
    vi.mocked(fetchContactsPage).mockResolvedValue({
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
      { after: 'cursor1', sort: DEFAULT_CONTACT_SORT },
      false
    )
  })

  it('loads the first page again when the server rejects the cursor', async () => {
    vi.mocked(fetchContactsPage).mockRejectedValueOnce({
      response: { status: 400 },
      message: 'Bad'
    })
    renderPage(
      '/contacts/book1',
      { book1: makeBook('book1', [alice]) },
      { book1: makeListing('book1', [alice], 'stale') }
    )

    expect(await screen.findByText('Bob Martin')).toBeInTheDocument()
    expect(fetchContactsPage).toHaveBeenLastCalledWith(
      'u1',
      expect.objectContaining({ id: 'book1' }),
      { after: null, sort: DEFAULT_CONTACT_SORT },
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
      { after: null, sort: DEFAULT_CONTACT_SORT },
      false
    )
  })

  it('loads the contacts of every address book on My contacts', async () => {
    renderPage('/contacts', { book1: makeBook('book1', []) })

    expect(await screen.findByText('Bob Martin')).toBeInTheDocument()
    expect(fetchContactsPage).toHaveBeenCalledWith(
      'u1',
      null,
      { after: null, sort: DEFAULT_CONTACT_SORT },
      false
    )
  })

  it('loads the first page again when the books are loaded again meanwhile', async () => {
    type Books = Awaited<ReturnType<typeof fetchAddressBooks>>
    let resolveSecondLoad: (books: Books) => void = () => undefined
    vi.mocked(fetchAddressBooks)
      .mockResolvedValueOnce([makeBook('book1', [])])
      .mockReturnValueOnce(
        new Promise<Books>(resolve => (resolveSecondLoad = resolve))
      )
    vi.mocked(fetchContactsPage).mockImplementationOnce(
      () => new Promise(() => undefined)
    )
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
    vi.mocked(fetchContactsPage).mockResolvedValue({
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
      { after: null, sort: DEFAULT_CONTACT_SORT },
      false
    )
  })
})

describe('AddressBookPage load failure', () => {
  const failure = { response: { status: 500 }, message: 'Server error' }

  it('shows an error with a retry, not the empty state, when the first page fails', async () => {
    vi.mocked(fetchContactsPage)
      .mockRejectedValueOnce(failure)
      .mockResolvedValueOnce({
        entries: [{ addressBookId: 'book1', contact: alice }],
        next: null
      })
    renderPage('/contacts/book1', { book1: makeBook('book1', []) })

    expect(await screen.findByRole('alert')).toHaveTextContent(
      en.contacts.errors.load
    )
    expect(screen.queryByText(en.contacts.empty.title)).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: en.error.retry }))

    expect(await screen.findByText('Alice Roche')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('loads a failed book again on its next visit', async () => {
    vi.mocked(fetchContactsPage)
      .mockRejectedValueOnce(failure)
      .mockResolvedValue({
        entries: [{ addressBookId: 'book1', contact: alice }],
        next: null
      })
    renderPage(
      '/contacts/book1',
      { book1: makeBook('book1', []), book2: makeBook('book2', []) },
      { book2: makeListing('book2', [], null) }
    )
    expect(await screen.findByRole('alert')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Go to book2'))
    fireEvent.click(screen.getByText('Go to book1'))

    expect(await screen.findByText('Alice Roche')).toBeInTheDocument()
    expect(screen.queryByText(en.contacts.empty.title)).not.toBeInTheDocument()
  })

  it('keeps the loaded contacts with a retry when a later page fails', async () => {
    vi.mocked(fetchContactsPage)
      .mockRejectedValueOnce(failure)
      .mockResolvedValueOnce({
        entries: [{ addressBookId: 'book1', contact: bob }],
        next: null
      })
    renderPage(
      '/contacts/book1',
      { book1: makeBook('book1', [alice]) },
      { book1: makeListing('book1', [alice], 'cursor1') }
    )

    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(screen.getByText('Alice Roche')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: en.error.retry }))

    expect(await screen.findByText('Bob Martin')).toBeInTheDocument()
  })
})

describe('AddressBookPage sort', () => {
  it('loads the first page again in the order of a clicked column', async () => {
    vi.mocked(fetchContactsPage).mockResolvedValue({
      entries: [{ addressBookId: 'book1', contact: bob }],
      next: null
    })
    renderPage(
      '/contacts/book1',
      { book1: makeBook('book1', [alice]) },
      { book1: makeListing('book1', [alice], null) }
    )

    const table = screen.getByRole('table')
    fireEvent.click(screen.getByRole('button', { name: en.contacts.email }))

    // the table and the page header stay while the first page loads, with
    // a page of skeleton rows, not the two rows under a loaded list
    expect(screen.getByRole('table')).toBe(table)
    expect(screen.getAllByRole('row').length).toBeGreaterThan(3)
    expect(
      screen.getByRole('button', { name: en.contacts.empty.import })
    ).toBeInTheDocument()
    expect(await screen.findByText('Bob Martin')).toBeInTheDocument()
    expect(screen.queryByText('Alice Roche')).not.toBeInTheDocument()
    expect(fetchContactsPage).toHaveBeenLastCalledWith(
      'u1',
      expect.objectContaining({ id: 'book1' }),
      { after: null, sort: { by: 'email', order: 'asc' } },
      false
    )
  })
})

describe('AddressBookPage tabs', () => {
  it('starts again on My contacts after visiting an address book', () => {
    renderPage(
      '/contacts',
      {
        book1: makeBook('book1', [alice], 'u1'),
        shared: makeBook('shared', [bob], 'u2')
      },
      {
        [ALL_CONTACTS_LISTING]: {
          ...makeListing('book1', [alice], null),
          refs: [
            { addressBookId: 'book1', contactId: alice.id },
            { addressBookId: 'shared', contactId: bob.id }
          ]
        },
        book1: makeListing('book1', [alice], null),
        shared: makeListing('shared', [bob], null)
      }
    )

    fireEvent.click(screen.getByRole('tab', { name: 'Shared with me' }))
    expect(screen.queryByText('Alice Roche')).toBe(null)

    fireEvent.click(screen.getByText('Go to book1'))
    fireEvent.click(screen.getByText('Go to My contacts'))

    expect(screen.getByRole('tab', { name: 'My contacts' })).toHaveAttribute(
      'aria-selected',
      'true'
    )
    expect(screen.getByText('Alice Roche')).toBeInTheDocument()
    expect(screen.getByText('Bob Martin')).toBeInTheDocument()
  })

  it('switches books without a query nor an extra history entry', () => {
    renderPage(
      '/contacts?scope=shared',
      {
        book1: makeBook('book1', [alice], 'u1'),
        book2: makeBook('book2', [alice], 'u1'),
        shared: makeBook('shared', [bob], 'u2')
      },
      {
        [ALL_CONTACTS_LISTING]: {
          ...makeListing('book1', [alice], null),
          refs: [
            { addressBookId: 'book1', contactId: alice.id },
            { addressBookId: 'shared', contactId: bob.id }
          ]
        },
        book1: makeListing('book1', [alice], null),
        book2: makeListing('book2', [alice], null),
        shared: makeListing('shared', [bob], null)
      }
    )
    const location = (): string | null => screen.getByRole('status').textContent

    fireEvent.click(screen.getByText('Go to book1'))
    expect(location()).toBe('/contacts/book1')
    fireEvent.click(screen.getByText('Go to book2'))
    expect(location()).toBe('/contacts/book2')

    fireEvent.click(screen.getByText('Go back'))
    expect(location()).toBe('/contacts/book1')
    fireEvent.click(screen.getByText('Go back'))
    expect(location()).toBe('/contacts?scope=shared')
    expect(screen.getByRole('tab', { name: 'Shared with me' })).toHaveAttribute(
      'aria-selected',
      'true'
    )
  })
})

describe('AddressBookPage headings', () => {
  it('names the address book in the only h1', () => {
    renderPage(
      '/contacts/book1',
      { book1: makeBook('book1', [alice], 'u1') },
      { book1: makeListing('book1', [alice], null) }
    )

    const headings = screen.getAllByRole('heading', { level: 1 })
    expect(headings).toHaveLength(1)
    expect(headings[0]).toHaveTextContent('book1')
  })

  it('makes the not found message the h1 of an unknown book', () => {
    renderPage('/contacts/unknown', { book1: makeBook('book1', [], 'u1') })

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: en.contacts.addressBookNotFound
      })
    ).toBeInTheDocument()
  })
})
