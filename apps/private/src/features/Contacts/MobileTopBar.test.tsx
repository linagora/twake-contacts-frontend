import { fireEvent, render, screen } from '@testing-library/react'
import { Provider } from 'react-redux'
import { MemoryRouter } from 'react-router'
import { TwakeMuiThemeProvider } from '@linagora/twake-mui'
import I18n from 'twake-i18n'
import { setupStore } from '@common/app/store'
import { UserState } from '@common/features/User/UserSlice'
import en from '@common/locales/en.json'
import { MobileTopBar, MobileTopBarProps } from './MobileTopBar'

jest.mock('@linagora/twake-mui', () => {
  const actual = jest.requireActual('@linagora/twake-mui')
  return {
    ...actual,
    useBreakpoints: () => ({
      isMobile: true,
      isTablet: false,
      isDesktop: false,
      isExtraLarge: false
    })
  }
})

const defaultPreloadedState = {
  user: { userData: { openpaasId: 'u1' } } as UserState,
  contacts: {
    addressBooks: {
      contacts: {
        id: 'contacts',
        userId: 'u1',
        name: 'My contacts',
        contactsCount: 0,
        acl: [],
        canWrite: true,
        contacts: []
      }
    },
    loading: false,
    error: null
  }
}

const renderMobileTopBar = (
  props: Partial<MobileTopBarProps> = {},
  preloadedState = defaultPreloadedState
) => {
  const store = setupStore(preloadedState)
  const defaultProps: MobileTopBarProps = {
    onOpenSidebar: jest.fn(),
    onToggleSearch: jest.fn(),
    isAddressBookPage: true,
    title: 'My contacts',
    addressBookId: 'contacts',
    ...props
  }

  return {
    ...render(
      <Provider store={store}>
        <TwakeMuiThemeProvider>
          <I18n dictRequire={() => en} lang="en">
            <MemoryRouter>
              <MobileTopBar {...defaultProps} />
            </MemoryRouter>
          </I18n>
        </TwakeMuiThemeProvider>
      </Provider>
    ),
    props: defaultProps
  }
}

describe('MobileTopBar', () => {
  it('renders menu icon button and calls onOpenSidebar when clicked', () => {
    const onOpenSidebar = jest.fn()
    renderMobileTopBar({ onOpenSidebar })

    const menuButton = screen.getByRole('button', {
      name: en.contacts.nav.menu
    })
    expect(menuButton).toBeInTheDocument()

    fireEvent.click(menuButton)
    expect(onOpenSidebar).toHaveBeenCalledTimes(1)
  })

  it('renders title and hides import button for an empty address book', () => {
    renderMobileTopBar({
      isAddressBookPage: true,
      title: 'Custom Address Book'
    })

    expect(
      screen.getByRole('heading', { name: 'Custom Address Book' })
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: en.contacts.empty.import })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: en.contacts.nav.search })
    ).not.toBeInTheDocument()
  })

  it('renders search button and hides title/import button when not on address book page', () => {
    const onToggleSearch = jest.fn()
    renderMobileTopBar({
      isAddressBookPage: false,
      title: 'Should not display',
      onToggleSearch
    })

    expect(
      screen.queryByRole('heading', { name: 'Should not display' })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: en.contacts.empty.import })
    ).not.toBeInTheDocument()

    const searchButton = screen.getByRole('button', {
      name: en.contacts.nav.search
    })
    expect(searchButton).toBeInTheDocument()

    fireEvent.click(searchButton)
    expect(onToggleSearch).toHaveBeenCalledTimes(1)
  })
})
