import { fireEvent, render, screen } from '@testing-library/react'
import { Provider } from 'react-redux'
import { MemoryRouter } from 'react-router'
import { TwakeMuiThemeProvider } from '@linagora/twake-mui'
import I18n from 'twake-i18n'
import { setupStore } from '@common/app/store'
import { Contact } from '@common/features/Contacts/contactsTypes'
import { UserState } from '@common/features/User/UserSlice'
import en from '@common/locales/en.json'
import { openCalendarEvent } from '@common/utils/calendarSpaUrl'
import { openChat } from '@common/utils/chatSpaUrl'
import { openMailComposer } from '@common/utils/mailSpaUrl'
import { ContactQuickActions } from './ContactQuickActions'

vi.mock('@common/utils/calendarSpaUrl')
vi.mock('@common/utils/chatSpaUrl')
vi.mock('@common/utils/mailSpaUrl')

const mockUseBreakpoints = vi.hoisted(() =>
  vi.fn(() => ({
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    isExtraLarge: false
  }))
)

vi.mock('@linagora/twake-mui', async () => {
  const actual = await vi.importActual<typeof import('@linagora/twake-mui')>(
    '@linagora/twake-mui'
  )
  return {
    ...actual,
    useBreakpoints: (): ReturnType<typeof mockUseBreakpoints> =>
      mockUseBreakpoints()
  }
})

const defaultContact: Contact = {
  id: 'c1',
  displayName: 'Alice Roche',
  emails: [{ type: 'work', value: 'alice@example.com' }],
  socialProfiles: [{ type: 'matrix', value: '@alice:matrix.org' }]
}

const renderQuickActions = (
  contact: Contact = defaultContact,
  workplaceFqdn = 'twake.app'
): void => {
  const store = setupStore({
    user: {
      userData: {
        openpaasId: 'u1',
        workplaceFqdn
      }
    } as UserState
  })

  render(
    <Provider store={store}>
      <TwakeMuiThemeProvider>
        <I18n dictRequire={() => en} lang="en">
          <MemoryRouter>
            <ContactQuickActions contact={contact} />
          </MemoryRouter>
        </I18n>
      </TwakeMuiThemeProvider>
    </Provider>
  )
}

describe('ContactQuickActions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseBreakpoints.mockReturnValue({
      isMobile: false,
      isTablet: false,
      isDesktop: true,
      isExtraLarge: false
    })
  })

  it('renders quick action buttons with labels on desktop', () => {
    renderQuickActions()

    const mailButton = screen.getByTestId('contact-mail-button')
    const chatButton = screen.getByTestId('contact-chat-button')
    const calendarButton = screen.getByTestId('contact-calendar-button')

    expect(mailButton).toBeInTheDocument()
    expect(chatButton).toBeInTheDocument()
    expect(calendarButton).toBeInTheDocument()
    expect(mailButton).toHaveTextContent('Send email')
    expect(chatButton).toHaveTextContent('Open chat')
    expect(calendarButton).toHaveTextContent('Create event')
    expect(mailButton).toHaveAccessibleName('Send email')
    expect(chatButton).toHaveAccessibleName('Open chat')
    expect(calendarButton).toHaveAccessibleName('Create event')
  })

  it('renders quick action buttons without labels on mobile', () => {
    mockUseBreakpoints.mockReturnValue({
      isMobile: true,
      isTablet: false,
      isDesktop: false,
      isExtraLarge: false
    })

    renderQuickActions()

    const mailButton = screen.getByTestId('contact-mail-button')
    const chatButton = screen.getByTestId('contact-chat-button')
    const calendarButton = screen.getByTestId('contact-calendar-button')

    expect(mailButton).not.toHaveTextContent('Send email')
    expect(chatButton).not.toHaveTextContent('Open chat')
    expect(calendarButton).not.toHaveTextContent('Create event')
    expect(mailButton).toHaveAccessibleName('Send email')
    expect(chatButton).toHaveAccessibleName('Open chat')
    expect(calendarButton).toHaveAccessibleName('Create event')
  })

  it('disables buttons when contact lacks email or chat target', () => {
    const contactWithoutInfo: Contact = {
      id: 'c2',
      displayName: 'Bob',
      emails: []
    }

    renderQuickActions(contactWithoutInfo)

    expect(screen.getByTestId('contact-mail-button')).toBeDisabled()
    expect(screen.getByTestId('contact-chat-button')).toBeDisabled()
    expect(screen.getByTestId('contact-calendar-button')).toBeDisabled()
  })

  it('calls openMailComposer when mail button is clicked', () => {
    renderQuickActions()

    fireEvent.click(screen.getByTestId('contact-mail-button'))

    expect(openMailComposer).toHaveBeenCalledWith('alice@example.com', {
      workplaceFqdn: 'twake.app'
    })
  })

  it('calls openChat when chat button is clicked', () => {
    renderQuickActions()

    fireEvent.click(screen.getByTestId('contact-chat-button'))

    expect(openChat).toHaveBeenCalledWith('@alice:matrix.org', {
      workplaceFqdn: 'twake.app'
    })
  })

  it('calls openCalendarEvent when calendar button is clicked', () => {
    renderQuickActions()

    fireEvent.click(screen.getByTestId('contact-calendar-button'))

    expect(openCalendarEvent).toHaveBeenCalledWith('alice@example.com', {
      workplaceFqdn: 'twake.app'
    })
  })
})
