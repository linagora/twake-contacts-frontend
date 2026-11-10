import { fireEvent, render, screen, within } from '@testing-library/react'
import { Provider } from 'react-redux'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { TwakeMuiThemeProvider } from '@linagora/twake-mui'
import I18n from 'twake-i18n'
import { setupStore } from '@common/app/store'
import { useAppSelector } from '@common/app/hooks'
import {
  deleteAddressBook,
  fetchAddressBookDetails,
  resolveAddressBookMember
} from '@common/features/Contacts/ContactsDao'
import { DEFAULT_CONTACT_SORT } from '@common/features/Contacts/constants'
import { AddressBookWithContacts } from '@common/features/Contacts/contactsTypes'
import { AddressBookAccessLevel } from '@common/features/Contacts/davTypes'
import { UserState } from '@common/features/User/UserSlice'
import { userData } from '@common/features/User/userDataTypes'
import en from '@common/locales/en.json'
import { AddressBookHeader } from './AddressBookHeader'

vi.mock('@common/features/Contacts/ContactsDao')

const makeUser = (id: string, givenName: string): userData => ({
  openpaasId: id,
  email: `${id}@example.com`,
  given_name: givenName,
  family_name: 'Martin',
  name: `${givenName} Martin`,
  sid: id,
  sub: id
})

const bob: userData = {
  ...makeUser('bob', 'Bob'),
  role: AddressBookAccessLevel.Viewer
}

const aliceBook: AddressBookWithContacts = {
  id: 'book1',
  userId: 'alice',
  name: 'Clients',
  contactsCount: null,
  acl: [],
  canWrite: true,
  contacts: []
}

const bookSharedWithBob: AddressBookWithContacts = {
  ...aliceBook,
  id: 'copy1',
  userId: 'bob',
  ownerId: 'alice',
  ownerDisplayName: 'alice alice',
  shareAccess: AddressBookAccessLevel.Viewer,
  canWrite: false
}

const LocationProbe: React.FC = () => <output>{useLocation().pathname}</output>

// the header of the book as stored, as the page renders it
const StoredBookHeader: React.FC<{ bookId: string }> = ({ bookId }) => {
  const book = useAppSelector(state => state.contacts.addressBooks[bookId])
  return book ? <AddressBookHeader book={book} /> : null
}

const renderHeader = (book: AddressBookWithContacts): void => {
  const store = setupStore({
    user: { userData: makeUser(book.userId, book.userId) } as UserState,
    contacts: {
      addressBooks: { [book.id]: book },
      listings: {},
      sort: DEFAULT_CONTACT_SORT,
      loading: false,
      error: null
    }
  })
  render(
    <Provider store={store}>
      <TwakeMuiThemeProvider>
        <I18n dictRequire={() => en} lang="en">
          <MemoryRouter initialEntries={[`/contacts/${book.id}`]}>
            <LocationProbe />
            <Routes>
              <Route path="/contacts" element={null} />
              <Route
                path="/contacts/:addressBookId"
                element={<StoredBookHeader bookId={book.id} />}
              />
            </Routes>
          </MemoryRouter>
        </I18n>
      </TwakeMuiThemeProvider>
    </Provider>
  )
}

const openMoreActions = (): boolean =>
  fireEvent.click(screen.getByRole('button', { name: 'More actions' }))

const menuItemLabels = (): (string | null)[] =>
  within(screen.getByRole('menu'))
    .getAllByRole('menuitem')
    .map(item => item.textContent)

describe('AddressBookHeader', () => {
  beforeEach(() => {
    vi.mocked(fetchAddressBookDetails).mockResolvedValue({
      members: [],
      isPublic: false
    })
    vi.mocked(resolveAddressBookMember).mockImplementation(m =>
      Promise.resolve(m)
    )
  })

  afterEach(() => vi.clearAllMocks())

  it('shows the name, Share and More actions, and no status, on a private book', async () => {
    renderHeader(aliceBook)

    expect(screen.getByRole('heading', { name: 'Clients' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Share' })).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'More actions' })
    ).toBeInTheDocument()
    await vi.waitFor(() =>
      expect(fetchAddressBookDetails).toHaveBeenCalledWith('alice', 'book1')
    )
    expect(screen.queryByText(/Shared/)).not.toBeInTheDocument()
  })

  it('tells with how many people the book is shared, and opens the Share dialog from it', async () => {
    vi.mocked(fetchAddressBookDetails).mockResolvedValue({
      members: [bob],
      isPublic: true
    })
    renderHeader(aliceBook)

    const status = await screen.findByRole('button', {
      name: 'Shared with 1 person · Visible to your organization'
    })
    fireEvent.click(status)

    expect(await screen.findByRole('dialog')).toHaveTextContent('Share Clients')
  })

  it('tells the owner and the role on a book shared with the user, without Share', () => {
    renderHeader(bookSharedWithBob)

    expect(
      screen.getByText('Shared by alice alice · Viewer')
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /Shared by/ })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Share' })
    ).not.toBeInTheDocument()
    expect(fetchAddressBookDetails).not.toHaveBeenCalled()

    openMoreActions()
    expect(menuItemLabels()).toEqual(['Export', 'Remove from my list'])
  })

  it('offers the actions of the sidebar on a book of the user', () => {
    renderHeader(aliceBook)

    openMoreActions()

    expect(menuItemLabels()).toEqual(['Share', 'Rename', 'Export', 'Delete'])
  })

  it('goes to My contacts once the book is removed', async () => {
    vi.mocked(deleteAddressBook).mockResolvedValue(undefined)
    renderHeader(bookSharedWithBob)

    openMoreActions()
    fireEvent.click(
      screen.getByRole('menuitem', { name: 'Remove from my list' })
    )
    fireEvent.click(await screen.findByRole('button', { name: 'Remove' }))

    await vi.waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(/^\/contacts$/)
    )
    expect(deleteAddressBook).toHaveBeenCalledWith('bob', 'copy1')
  })
})
