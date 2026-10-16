import { act, fireEvent, render, screen } from '@testing-library/react'
import { Provider } from 'react-redux'
import { MemoryRouter, Route, Routes } from 'react-router'
import { TwakeMuiThemeProvider, VirtuosoMockContext } from '@linagora/twake-mui'
import I18n from 'twake-i18n'
import { setupStore } from '@common/app/store'
import { ContactEntry } from '@common/features/Contacts/contactsTypes'
import { UserState } from '@common/features/User/UserSlice'
import en from '@common/locales/en.json'
import { ContactsTable } from './ContactsTable'

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

const jane: ContactEntry = {
  addressBookId: 'book1',
  contact: {
    id: 'c1',
    displayName: 'Jane Smith',
    emails: [{ type: null, value: 'jane@example.com' }]
  }
}

const renderTable = (loadingMore = false): ReturnType<typeof render> =>
  render(
    <Provider
      store={setupStore({
        user: { userData: { openpaasId: 'u1' } } as UserState
      })}
    >
      {' '}
      <TwakeMuiThemeProvider>
        <I18n dictRequire={() => en} lang="en">
          <VirtuosoMockContext.Provider
            value={{ viewportHeight: 1000, itemHeight: 50 }}
          >
            <MemoryRouter initialEntries={['/contacts/book1']}>
              <Routes>
                <Route
                  path="/contacts/:addressBookId"
                  element={
                    <ContactsTable
                      entries={[jane]}
                      onEndReached={jest.fn()}
                      loadingMore={loadingMore}
                    />
                  }
                />
                <Route
                  path="/contacts/:addressBookId/:contactId"
                  element={<div>contact page</div>}
                />
              </Routes>
            </MemoryRouter>
          </VirtuosoMockContext.Provider>
        </I18n>
      </TwakeMuiThemeProvider>
    </Provider>
  )

describe('ContactsTable', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    window.MAIL_SPA_URL = 'https://mail.example.com'
    mockUseBreakpoints.mockReturnValue({
      isMobile: false,
      isTablet: false,
      isDesktop: true,
      isExtraLarge: false
    })
  })

  afterEach(() => {
    jest.useRealTimers()
    delete window.MAIL_SPA_URL
  })

  const openNamePopover = (): void => {
    fireEvent.mouseEnter(screen.getByRole('button', { name: /Jane Smith/ }))
    act(() => {
      jest.advanceTimersByTime(1000)
    })
  }

  it('adds two skeleton rows while fetching more contacts', () => {
    renderTable(true)

    // header + Jane + 2 skeletons
    expect(screen.getAllByRole('row')).toHaveLength(4)
  })

  it('renders all columns on desktop', () => {
    renderTable()

    expect(screen.getByText(en.contacts.name)).toBeInTheDocument()
    expect(screen.getByText(en.contacts.email)).toBeInTheDocument()
    expect(screen.getByText(en.contacts.phone)).toBeInTheDocument()
    expect(screen.getByText(en.contacts.team)).toBeInTheDocument()
  })

  it('renders only name and actions columns on mobile', () => {
    mockUseBreakpoints.mockReturnValue({
      isMobile: true,
      isTablet: false,
      isDesktop: false,
      isExtraLarge: false
    })

    renderTable()

    expect(screen.getByText(en.contacts.name)).toBeInTheDocument()
    expect(screen.queryByText(en.contacts.email)).not.toBeInTheDocument()
    expect(screen.queryByText(en.contacts.phone)).not.toBeInTheDocument()
    expect(screen.queryByText(en.contacts.team)).not.toBeInTheDocument()
  })

  it('opens the contact when clicking its row', () => {
    renderTable()

    fireEvent.click(screen.getByText('jane@example.com'))

    expect(screen.getByText('contact page')).toBeInTheDocument()
  })

  it('does not open the contact when clicking outside its name popover', () => {
    renderTable()
    openNamePopover()

    const backdrop = document.querySelector('.MuiBackdrop-root')
    expect(backdrop).not.toBeNull()
    fireEvent.click(backdrop as Element)

    expect(screen.queryByText('contact page')).not.toBeInTheDocument()
  })
})
