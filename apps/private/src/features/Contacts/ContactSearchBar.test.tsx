import { fireEvent, render, screen, waitFor, act } from '@testing-library/react'
import { Provider } from 'react-redux'
import { MemoryRouter, useLocation } from 'react-router'
import { TwakeMuiThemeProvider } from '@linagora/twake-mui'
import I18n from 'twake-i18n'
import { setupStore } from '@common/app/store'
import { searchContacts } from '@common/features/Contacts/ContactsDao'
import { UserState } from '@common/features/User/UserSlice'
import { ContactsState } from '@common/features/Contacts/contactsTypes'
import en from '@common/locales/en.json'
import { ContactSearchBar } from './ContactSearchBar'

jest.mock('@common/features/Contacts/ContactsDao')

const mockedSearchContacts = searchContacts as jest.Mock

function LocationDisplay(): JSX.Element {
  const location = useLocation()
  return <div data-testid="location">{location.pathname}</div>
}

function renderSearchBar(
  contactsState: Partial<ContactsState> = {},
  showLocation = false
): ReturnType<typeof render> {
  const store = setupStore({
    user: { userData: { openpaasId: 'u1' } } as UserState,
    contacts: {
      addressBooks: {},
      loading: false,
      error: null,
      ...contactsState
    }
  })

  return render(
    <Provider store={store}>
      <TwakeMuiThemeProvider>
        <I18n dictRequire={() => en} lang="en">
          <MemoryRouter>
            <ContactSearchBar />
            {showLocation && <LocationDisplay />}
          </MemoryRouter>
        </I18n>
      </TwakeMuiThemeProvider>
    </Provider>
  )
}

async function typeSearchQuery(value: string): Promise<void> {
  const input = screen.getByPlaceholderText('Search contacts...')
  fireEvent.focus(input)
  fireEvent.input(input, { target: { value } })

  await act(async () => {
    jest.advanceTimersByTime(300)
  })
}

describe('ContactSearchBar', () => {
  beforeEach(() => {
    mockedSearchContacts.mockReset()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('searches across all loaded address books', async () => {
    mockedSearchContacts.mockResolvedValue([])

    renderSearchBar({
      addressBooks: {
        contacts: {
          id: 'contacts',
          userId: 'u1',
          name: 'Contacts',
          contactsCount: 2,
          acl: [],
          canWrite: true,
          contacts: []
        },
        collected: {
          id: 'collected',
          userId: 'u1',
          name: 'Collected',
          contactsCount: 1,
          acl: [],
          canWrite: false,
          contacts: []
        },
        dab: {
          id: 'dab',
          userId: 'd1',
          name: 'Domain Address Book',
          contactsCount: 5,
          acl: [],
          canWrite: false,
          contacts: []
        }
      }
    })

    await typeSearchQuery('alice')

    await waitFor(() => {
      expect(mockedSearchContacts).toHaveBeenCalledWith(
        [
          { userId: 'u1', addressBookId: 'contacts' },
          { userId: 'u1', addressBookId: 'collected' },
          { userId: 'd1', addressBookId: 'domain-members' }
        ],
        'alice'
      )
    })
  })

  it('navigates to the contact detail on selection', async () => {
    mockedSearchContacts.mockResolvedValue([
      {
        addressBookId: 'collected',
        contact: { id: 'c1', displayName: 'Alice', emails: [] }
      }
    ])

    renderSearchBar(
      {
        addressBooks: {
          collected: {
            id: 'collected',
            userId: 'u1',
            name: 'Collected',
            contactsCount: 1,
            acl: [],
            canWrite: false,
            contacts: []
          }
        }
      },
      true
    )

    await typeSearchQuery('alice')

    await waitFor(() => {
      expect(mockedSearchContacts).toHaveBeenCalled()
    })

    const option = await screen.findByText('Alice')
    fireEvent.click(option)

    await waitFor(() => {
      expect(screen.getByTestId('location').textContent).toBe(
        '/contacts/collected/c1'
      )
    })

    expect(screen.getByPlaceholderText('Search contacts...')).toHaveValue('')
  })

  it('does not search when no address books are loaded', async () => {
    mockedSearchContacts.mockResolvedValue([])

    renderSearchBar()

    await typeSearchQuery('alice')

    await waitFor(() => {
      expect(mockedSearchContacts).not.toHaveBeenCalled()
    })
  })
})
