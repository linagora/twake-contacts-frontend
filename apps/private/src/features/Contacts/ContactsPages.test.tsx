import { render, screen } from '@testing-library/react'
import { Provider } from 'react-redux'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { VirtuosoMockContext } from '@linagora/twake-mui'
import I18n from 'twake-i18n'
import { setupStore } from '@common/app/store'
import { UserState } from '@common/features/User/UserSlice'
import en from '@common/locales/en.json'
import { AddressBookPage } from './AddressBookPage'
import { ContactPage } from './ContactPage'

const renderContacts = (path: string): ReturnType<typeof render> =>
  render(
    <Provider
      store={setupStore({
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
          },
          loading: false,
          error: null
        }
      })}
    >
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
            </Routes>
          </MemoryRouter>
        </VirtuosoMockContext.Provider>
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
  const originalMailSpaUrl = (window as Window & { MAIL_SPA_URL?: string })
    .MAIL_SPA_URL
  const originalChatSpaUrl = (window as Window & { CHAT_SPA_URL?: string })
    .CHAT_SPA_URL
  const originalCalendarSpaUrl = (
    window as Window & { CALENDAR_SPA_URL?: string }
  ).CALENDAR_SPA_URL

  beforeEach(() => {
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

  it('shows quick action buttons when contact has email', () => {
    renderContacts('/contacts/book1/c1')

    expect(screen.getByTestId('contact-mail-button')).toBeInTheDocument()
    expect(screen.getByTestId('contact-calendar-button')).toBeInTheDocument()
  })

  it('hides quick action buttons when contact has no email', () => {
    renderContacts('/contacts/book2/c2')

    expect(screen.queryByTestId('contact-mail-button')).not.toBeInTheDocument()
    expect(screen.queryByTestId('contact-chat-button')).not.toBeInTheDocument()
    expect(
      screen.queryByTestId('contact-calendar-button')
    ).not.toBeInTheDocument()
  })

  it('shows a not found message for an unknown contact', () => {
    renderContacts('/contacts/book1/unknown')

    expect(screen.getByText('Contact not found')).toBeInTheDocument()
  })
})
