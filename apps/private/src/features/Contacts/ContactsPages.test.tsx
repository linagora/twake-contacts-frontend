import { setupStore } from '@common/app/store'
import { fetchContact } from '@common/features/Contacts/ContactsDao'
import { DEFAULT_ADDRESS_BOOK_ID } from '@common/features/Contacts/constants'
import { UserState } from '@common/features/User/UserSlice'
import en from '@common/locales/en.json'
import { fireEvent, render, screen } from '@testing-library/react'
import { Provider } from 'react-redux'
import { MemoryRouter, Route, Routes } from 'react-router'
import { TwakeMuiThemeProvider, VirtuosoMockContext } from '@linagora/twake-mui'
import I18n from 'twake-i18n'
import { AddressBookPage } from './AddressBookPage'
import { ContactPage } from './ContactPage'
import { CreateContactPage } from './CreateContactPage'
import { EditContactPage } from './EditContactPage'

const mockUseBreakpoints = jest.fn(() => ({
  isMobile: false,
  isTablet: false,
  isDesktop: true,
  isExtraLarge: false
}))

jest.mock('@linagora/twake-mui', () => {
  const actual = jest.requireActual('@linagora/twake-mui')
  return {
    ...actual,
    useBreakpoints: () => mockUseBreakpoints()
  }
})

jest.mock('@common/features/Contacts/ContactsDao', () => ({
  ...jest.requireActual('@common/features/Contacts/ContactsDao'),
  fetchContact: jest.fn()
}))

const renderWithStore = (
  path: string,
  store: ReturnType<typeof setupStore>
): ReturnType<typeof render> =>
  render(
    <Provider store={store}>
      <TwakeMuiThemeProvider>
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
                <Route
                  path="/contacts/:addressBookId/:contactId"
                  element={<ContactPage />}
                />
                <Route path="/contacts/new" element={<CreateContactPage />} />
                <Route
                  path="/contacts/:addressBookId/:contactId/edit"
                  element={<EditContactPage />}
                />
              </Routes>
            </MemoryRouter>
          </VirtuosoMockContext.Provider>
        </I18n>
      </TwakeMuiThemeProvider>
    </Provider>
  )

const renderContacts = (path: string): ReturnType<typeof render> =>
  renderWithStore(
    path,
    setupStore({
      user: {
        userData: {
          email: 'user@twake.app',
          name: 'Test User',
          given_name: 'Test',
          family_name: 'User',
          sid: 's1',
          sub: 'sub1',
          workplaceFqdn: 'user.twake.linagora.com'
        },
        tokens: null,
        coreConfig: { language: null, datetime: { timeZone: null } },
        loading: false,
        error: null
      } as UserState,
      contacts: {
        addressBooks: {
          collected: {
            id: 'collected',
            userId: 'u1',
            name: 'Collected',
            contactsCount: 1,
            acl: [],
            canWrite: false,
            contacts: [
              { id: 'c3', displayName: 'Collected Contact', emails: [] }
            ]
          },
          contacts: {
            id: DEFAULT_ADDRESS_BOOK_ID,
            userId: 'u1',
            name: 'My contacts',
            contactsCount: 1,
            acl: [],
            canWrite: true,
            contacts: [
              {
                id: 'c4',
                displayName: 'My Contact',
                emails: [],
                categories: []
              }
            ]
          },
          book2: {
            id: 'book2',
            userId: 'u1',
            name: 'Book 2',
            contactsCount: 1,
            acl: [],
            canWrite: true,
            contacts: [{ id: 'c2', displayName: 'Alice Roche', emails: [] }]
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
                displayName: 'Isabella Martinez',
                emails: [{ type: 'work', value: 'martinez@twake.app' }],
                phones: [{ type: 'cell', value: '+3365024491' }],
                categories: ['Information'],
                addresses: [
                  {
                    type: 'home',
                    poBox: '',
                    extended: '',
                    street: '23 Rue de Mogador',
                    postalCode: '75009',
                    locality: 'Paris',
                    region: '',
                    country: ''
                  }
                ]
              }
            ]
          }
        },
        loading: false,
        error: null
      }
    })
  )

describe('AddressBookPage', () => {
  it('shows a not found message for an unknown address book', () => {
    renderContacts('/contacts/deleted-book')

    expect(screen.getByText('Address book not found')).toBeInTheDocument()
    expect(screen.queryByText('No contacts yet')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back' })).toHaveAttribute(
      'href',
      '/contacts'
    )
  })

  it('lists contacts from every address book on My contacts', () => {
    renderContacts('/contacts')

    expect(screen.getAllByText('My contacts')).toHaveLength(2)
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
  const originalMailSpaUrl = (window as Window & { MAIL_SPA_URL?: string })
    .MAIL_SPA_URL
  const originalChatSpaUrl = (window as Window & { CHAT_SPA_URL?: string })
    .CHAT_SPA_URL
  const originalCalendarSpaUrl = (
    window as Window & { CALENDAR_SPA_URL?: string }
  ).CALENDAR_SPA_URL

  beforeEach(() => {
    mockUseBreakpoints.mockReturnValue({
      isMobile: false,
      isTablet: false,
      isDesktop: true,
      isExtraLarge: false
    })
    ;(window as Window & { MAIL_SPA_URL: string }).MAIL_SPA_URL =
      'https://mail.example.com'
    ;(window as Window & { CHAT_SPA_URL: string }).CHAT_SPA_URL =
      'https://chat.example.com/#/chat/@{target}'
    ;(window as Window & { CALENDAR_SPA_URL: string }).CALENDAR_SPA_URL =
      'https://calendar.example.com'
  })

  afterEach(() => {
    if (originalMailSpaUrl !== undefined) {
      ;(window as Window & { MAIL_SPA_URL: string }).MAIL_SPA_URL =
        originalMailSpaUrl
    } else {
      delete (window as Window & { MAIL_SPA_URL?: string }).MAIL_SPA_URL
    }
    if (originalChatSpaUrl !== undefined) {
      ;(window as Window & { CHAT_SPA_URL: string }).CHAT_SPA_URL =
        originalChatSpaUrl
    } else {
      delete (window as Window & { CHAT_SPA_URL?: string }).CHAT_SPA_URL
    }
    if (originalCalendarSpaUrl !== undefined) {
      ;(window as Window & { CALENDAR_SPA_URL: string }).CALENDAR_SPA_URL =
        originalCalendarSpaUrl
    } else {
      delete (window as Window & { CALENDAR_SPA_URL?: string }).CALENDAR_SPA_URL
    }
  })

  it('renders the contact details', () => {
    renderContacts('/contacts/book1/c1')

    expect(screen.getAllByText('Isabella Martinez')).toHaveLength(1)
    expect(screen.getByText('martinez@twake.app')).toBeInTheDocument()
    expect(screen.getByText('+3365024491')).toBeInTheDocument()
    expect(screen.getByText('Information')).toBeInTheDocument()
    expect(
      screen.getByText('23 Rue de Mogador, 75009 Paris')
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /back/i })).toHaveAttribute(
      'href',
      '/contacts/book1'
    )
  })

  it('shows quick action buttons with labels on desktop', () => {
    renderContacts('/contacts/book1/c1')

    const mailButton = screen.getByTestId('contact-mail-button')
    const chatButton = screen.getByTestId('contact-chat-button')
    const calendarButton = screen.getByTestId('contact-calendar-button')

    expect(mailButton).toBeInTheDocument()
    expect(chatButton).toBeInTheDocument()
    expect(calendarButton).toBeInTheDocument()
    expect(mailButton).toHaveTextContent('Send email')
    expect(chatButton).toHaveTextContent('Chat')
    expect(calendarButton).toHaveTextContent('Schedule')
  })

  it('shows quick action buttons without labels on mobile', () => {
    mockUseBreakpoints.mockReturnValue({
      isMobile: true,
      isTablet: false,
      isDesktop: false,
      isExtraLarge: false
    })

    renderContacts('/contacts/book1/c1')

    const mailButton = screen.getByTestId('contact-mail-button')
    const chatButton = screen.getByTestId('contact-chat-button')
    const calendarButton = screen.getByTestId('contact-calendar-button')

    expect(mailButton).toBeInTheDocument()
    expect(chatButton).toBeInTheDocument()
    expect(calendarButton).toBeInTheDocument()
    expect(mailButton).not.toHaveTextContent('Send email')
    expect(chatButton).not.toHaveTextContent('Chat')
    expect(calendarButton).not.toHaveTextContent('Schedule')
  })

  it('disable quick action buttons when contact has no email', () => {
    renderContacts('/contacts/book2/c2')

    expect(screen.queryByTestId('contact-mail-button')).toHaveProperty(
      'disabled'
    )
    expect(screen.queryByTestId('contact-chat-button')).toHaveProperty(
      'disabled'
    )
    expect(screen.queryByTestId('contact-calendar-button')).toHaveProperty(
      'disabled'
    )
  })

  it('shows a not found message for an unknown contact', async () => {
    jest.mocked(fetchContact).mockRejectedValue(new Error('Not found'))

    renderContacts('/contacts/book1/unknown')

    expect(await screen.findByText('Contact not found')).toBeInTheDocument()
  })

  it('fetches a contact that is not in the loaded pages of its book', async () => {
    jest.mocked(fetchContact).mockResolvedValue({
      id: 'c60',
      displayName: 'Search Own',
      emails: [{ type: 'work', value: 'own@twake.app' }]
    })

    renderContacts('/contacts/book1/c60')

    expect(await screen.findByText('own@twake.app')).toBeInTheDocument()
    expect(screen.queryByText('Contact not found')).not.toBeInTheDocument()
    expect(fetchContact).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'book1' }),
      'c60'
    )
  })

  it('does not fetch a contact already loaded', () => {
    jest.mocked(fetchContact).mockClear()

    renderContacts('/contacts/book1/c1')

    expect(fetchContact).not.toHaveBeenCalled()
  })

  it('does not render a categories row for a contact without categories', () => {
    renderContacts('/contacts/contacts/c4')

    expect(screen.queryAllByRole('listitem')).toHaveLength(0)
  })

  it('links back to main page for hidden address books', () => {
    renderContacts('/contacts/contacts/c4')

    expect(screen.getByRole('link', { name: /back/i })).toHaveAttribute(
      'href',
      '/contacts'
    )
  })

  it('links back to My contacts for a contact opened from My contacts', () => {
    renderContacts('/contacts')

    fireEvent.click(screen.getByText('martinez@twake.app'))

    expect(screen.getByRole('link', { name: /back/i })).toHaveAttribute(
      'href',
      '/contacts'
    )
  })

  it('links back to the address book for a contact opened from it', () => {
    renderContacts('/contacts/book1')

    fireEvent.click(screen.getByText('martinez@twake.app'))

    expect(screen.getByRole('link', { name: /back/i })).toHaveAttribute(
      'href',
      '/contacts/book1'
    )
  })
})

describe('before the address books are loaded', () => {
  const renderBeforeLoad = (path: string): ReturnType<typeof render> =>
    renderWithStore(
      path,
      setupStore({ user: { userData: { openpaasId: 'u1' } } as UserState })
    )

  const hasSkeleton = (container: HTMLElement): boolean =>
    container.querySelector('.MuiSkeleton-root') !== null

  it('shows skeletons instead of the empty state on My contacts', () => {
    const { container } = renderBeforeLoad('/contacts')

    expect(hasSkeleton(container)).toBe(true)
    expect(screen.queryByText('No contacts yet')).not.toBeInTheDocument()
  })

  it('shows skeletons instead of a not found message for an address book', () => {
    const { container } = renderBeforeLoad('/contacts/book1')

    expect(hasSkeleton(container)).toBe(true)
    expect(screen.queryByText('Address book not found')).not.toBeInTheDocument()
    expect(screen.queryByText('No contacts yet')).not.toBeInTheDocument()
  })

  it('shows skeletons instead of a not found message for a contact', () => {
    const { container } = renderBeforeLoad('/contacts/book1/c1')

    expect(hasSkeleton(container)).toBe(true)
    expect(screen.getByRole('button', { name: 'Back' })).toBeDisabled()
    expect(screen.queryByText('Contact not found')).not.toBeInTheDocument()
  })

  it('shows the form skeleton while creating a contact', () => {
    const { container } = renderBeforeLoad('/contacts/new')

    expect(hasSkeleton(container)).toBe(true)
    expect(screen.getByRole('button', { name: 'Back' })).toBeDisabled()
  })

  it('shows the form skeleton while editing a contact', () => {
    const { container } = renderBeforeLoad('/contacts/book1/c1/edit')

    expect(hasSkeleton(container)).toBe(true)
    expect(screen.getByRole('button', { name: 'Back' })).toBeDisabled()
  })
})
