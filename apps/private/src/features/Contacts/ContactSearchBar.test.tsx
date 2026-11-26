import {
  classifyAddressBook,
  classifyAddressBooks
} from '@common/features/Contacts/addressBookModel'
import type { Mock } from 'vitest'
import { DEFAULT_CONTACT_SORT } from '@common/features/Contacts/constants'
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

vi.mock('@common/features/Contacts/ContactsDao')

const mockedSearchContacts = searchContacts as Mock

function LocationDisplay(): React.JSX.Element {
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
      listings: {},
      sort: DEFAULT_CONTACT_SORT,
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

  await act(() => vi.advanceTimersByTimeAsync(300))
  // Debounce has completed; Testing Library can now poll using real timers.
  vi.useRealTimers()
}

// MUI renders its own status region in the suggestions popup
function resultsStatus(): HTMLElement {
  const region = screen
    .getAllByRole('status')
    .find(element => element.classList.contains('u-visuallyhidden'))
  if (!region) throw new Error('No results status region')
  return region
}

describe('ContactSearchBar', () => {
  beforeEach(() => {
    mockedSearchContacts.mockReset()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('searches across all loaded address books', async () => {
    mockedSearchContacts.mockResolvedValue([])

    renderSearchBar({
      addressBooks: classifyAddressBooks({
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
      })
    })

    await typeSearchQuery('alice')

    await waitFor(() => {
      expect(mockedSearchContacts).toHaveBeenCalledWith(
        [
          expect.objectContaining({ userId: 'u1', id: 'contacts' }),
          expect.objectContaining({ userId: 'u1', id: 'collected' }),
          expect.objectContaining({ userId: 'd1', id: 'dab' })
        ],
        'alice',
        expect.any(AbortSignal)
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
        addressBooks: classifyAddressBooks({
          collected: {
            id: 'collected',
            userId: 'u1',
            name: 'Collected',
            contactsCount: 1,
            acl: [],
            canWrite: false,
            contacts: []
          }
        })
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

  describe('results announcement', () => {
    const collectedBook = {
      addressBooks: {
        collected: classifyAddressBook(
          {
            id: 'collected',
            userId: 'u1',
            name: 'Collected',
            contactsCount: 1,
            acl: [],
            canWrite: false,
            contacts: []
          },
          'u1'
        )
      }
    }

    // Debounce, then delay before announcing the results
    async function searchAndWaitForAnnouncement(value: string): Promise<void> {
      const input = screen.getByPlaceholderText('Search contacts...')
      fireEvent.focus(input)
      fireEvent.input(input, { target: { value } })
      await act(async () => {
        await vi.advanceTimersByTimeAsync(300)
      })
      await act(async () => {
        await vi.advanceTimersByTimeAsync(500)
      })
    }

    it('announces the number of contacts found', async () => {
      mockedSearchContacts.mockResolvedValue([
        {
          addressBookId: 'collected',
          contact: { id: 'c1', displayName: 'Bruno', emails: [] }
        }
      ])
      renderSearchBar(collectedBook)

      await searchAndWaitForAnnouncement('Bruno')

      expect(mockedSearchContacts).toHaveBeenCalled()
      expect(resultsStatus()).toHaveTextContent('1 contact found')
    })

    it('announces that no contact matches', async () => {
      mockedSearchContacts.mockResolvedValue([])
      renderSearchBar(collectedBook)

      await searchAndWaitForAnnouncement('Nobody')

      expect(resultsStatus()).toHaveTextContent('No contacts found')
    })

    it('does not announce before the delay elapsed', async () => {
      mockedSearchContacts.mockResolvedValue([])
      renderSearchBar(collectedBook)

      const input = screen.getByPlaceholderText('Search contacts...')
      fireEvent.focus(input)
      fireEvent.input(input, { target: { value: 'Nobody' } })
      await act(async () => {
        await vi.advanceTimersByTimeAsync(300)
      })

      expect(mockedSearchContacts).toHaveBeenCalled()
      expect(resultsStatus()).toBeEmptyDOMElement()
    })

    it('announces that the search failed rather than no contact', async () => {
      mockedSearchContacts.mockRejectedValue(new Error('Network error'))
      renderSearchBar(collectedBook)

      await searchAndWaitForAnnouncement('Moreau')

      expect(resultsStatus()).toHaveTextContent(
        'Search is unavailable, try again'
      )
      expect(resultsStatus()).not.toHaveTextContent('No contacts found')
    })

    it('announces nothing once the field is cleared', async () => {
      mockedSearchContacts.mockResolvedValue([])
      renderSearchBar(collectedBook)

      await searchAndWaitForAnnouncement('Nobody')
      await searchAndWaitForAnnouncement('')

      expect(resultsStatus()).toBeEmptyDOMElement()
    })
  })

  describe('search failure', () => {
    const collectedBook = {
      addressBooks: classifyAddressBooks({
        collected: {
          id: 'collected',
          userId: 'u1',
          name: 'Collected',
          contactsCount: 1,
          acl: [],
          canWrite: false,
          contacts: []
        }
      })
    }

    it('shows that the search failed instead of no contact found', async () => {
      mockedSearchContacts.mockRejectedValue(new Error('Server error'))
      renderSearchBar(collectedBook)

      await typeSearchQuery('Moreau')

      expect(
        await screen.findByText('Search is unavailable, try again')
      ).toBeInTheDocument()
      expect(screen.queryByText('No contacts found')).not.toBeInTheDocument()
    })

    it('shows the results again once a later search succeeds', async () => {
      mockedSearchContacts
        .mockRejectedValueOnce(new Error('Server error'))
        .mockResolvedValue([
          {
            addressBookId: 'collected',
            contact: { id: 'c1', displayName: 'Amélie Moreau', emails: [] }
          }
        ])
      renderSearchBar(collectedBook)
      const input = screen.getByPlaceholderText('Search contacts...')
      fireEvent.focus(input)
      fireEvent.input(input, { target: { value: 'Moreau' } })
      await act(() => vi.advanceTimersByTimeAsync(300))
      expect(
        screen.getByText('Search is unavailable, try again')
      ).toBeInTheDocument()

      await typeSearchQuery('Amélie')

      expect(await screen.findByText('Amélie Moreau')).toBeInTheDocument()
      expect(
        screen.queryByText('Search is unavailable, try again')
      ).not.toBeInTheDocument()
    })
  })

  describe('superseded search', () => {
    const collectedBook = {
      addressBooks: classifyAddressBooks({
        collected: {
          id: 'collected',
          userId: 'u1',
          name: 'Collected',
          contactsCount: 1,
          acl: [],
          canWrite: false,
          contacts: []
        }
      })
    }

    function pendingSearch(): {
      settle: (entries: unknown[]) => void
      promise: Promise<unknown[]>
    } {
      let settle: (entries: unknown[]) => void = () => undefined
      const promise = new Promise<unknown[]>(resolve => {
        settle = resolve
      })
      return { settle, promise }
    }

    it('aborts the previous request and ignores its late answer', async () => {
      const chevalier = {
        addressBookId: 'collected',
        contact: { id: 'c1', displayName: 'Camille Chevalier', emails: [] }
      }
      const dupont = {
        addressBookId: 'collected',
        contact: { id: 'c2', displayName: 'Camille Dupont', emails: [] }
      }
      const first = pendingSearch()
      mockedSearchContacts
        .mockReturnValueOnce(first.promise)
        .mockResolvedValue([chevalier, dupont])
      renderSearchBar(collectedBook)
      const input = screen.getByPlaceholderText('Search contacts...')
      fireEvent.focus(input)
      fireEvent.input(input, { target: { value: 'Camille C' } })
      await act(() => vi.advanceTimersByTimeAsync(300))
      const firstSignal = mockedSearchContacts.mock.calls[0][2] as AbortSignal

      await typeSearchQuery('Camille')
      expect(await screen.findByText('Camille Dupont')).toBeInTheDocument()
      await act(async () => {
        first.settle([chevalier])
        await first.promise
      })

      expect(firstSignal.aborted).toBe(true)
      expect(screen.getByText('Camille Chevalier')).toBeInTheDocument()
      expect(screen.getByText('Camille Dupont')).toBeInTheDocument()
    })

    it('does not show an aborted request as a failure', async () => {
      mockedSearchContacts.mockImplementationOnce(
        (_books: unknown, _search: string, signal: AbortSignal) =>
          new Promise((_resolve, reject) =>
            signal.addEventListener('abort', () =>
              reject(new DOMException('Aborted', 'AbortError'))
            )
          )
      )
      mockedSearchContacts.mockResolvedValue([])
      renderSearchBar(collectedBook)
      const input = screen.getByPlaceholderText('Search contacts...')
      fireEvent.focus(input)
      fireEvent.input(input, { target: { value: 'Moreau' } })
      await act(() => vi.advanceTimersByTimeAsync(300))

      await typeSearchQuery('Nobody')

      expect(await screen.findByText('No contacts found')).toBeInTheDocument()
      expect(
        screen.queryByText('Search is unavailable, try again')
      ).not.toBeInTheDocument()
    })
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
