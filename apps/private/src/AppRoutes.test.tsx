import type { MockedFunction } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { Provider } from 'react-redux'
import { MemoryRouter } from 'react-router'
import { TwakeMuiThemeProvider, useBreakpoints } from '@linagora/twake-mui'
import I18n from 'twake-i18n'
import { setupStore } from '@common/app/store'
import en from '@common/locales/en.json'
import { AppRoutes } from './AppRoutes'

const mockMount = vi.hoisted(() => vi.fn())

vi.mock('@linagora/twake-mui', async () => ({
  ...(await vi.importActual<typeof import('@linagora/twake-mui')>(
    '@linagora/twake-mui'
  )),
  useBreakpoints: vi.fn()
}))

vi.mock('./features/Contacts/ContactsPage', async () => {
  const { useEffect } = await vi.importActual<typeof import('react')>('react')
  const { Outlet } =
    await vi.importActual<typeof import('react-router')>('react-router')
  return {
    ContactsPage: () => {
      useEffect(() => mockMount(), [])
      return <Outlet />
    }
  }
})

vi.mock('./features/Contacts/CreateContactPage', () => ({
  CreateContactPage: () => <input aria-label="First name" />
}))

vi.mock('./features/Contacts/ContactPage', async () => {
  const { useParams } =
    await vi.importActual<typeof import('react-router')>('react-router')
  return {
    ContactPage: () => {
      const { addressBookId, contactId } = useParams()
      return <p>{`Contact ${addressBookId}/${contactId}`}</p>
    }
  }
})

const mockUseBreakpoints = useBreakpoints as MockedFunction<
  typeof useBreakpoints
>

const setMobile = (isMobile: boolean): void => {
  mockUseBreakpoints.mockReturnValue({ isMobile } as ReturnType<
    typeof useBreakpoints
  >)
}

const appRoutesTree = (store = setupStore(), path = '/contacts/new') => (
  <Provider store={store}>
    <TwakeMuiThemeProvider>
      <I18n dictRequire={() => en} lang="en">
        <MemoryRouter initialEntries={[path]}>
          <AppRoutes />
        </MemoryRouter>
      </I18n>
    </TwakeMuiThemeProvider>
  </Provider>
)

describe('AppRoutes', () => {
  beforeEach(() => {
    mockMount.mockClear()
    setMobile(false)
  })

  it('renders the contact creation route on mobile', () => {
    setMobile(true)
    render(appRoutesTree())

    expect(
      screen.getByRole('textbox', { name: 'First name' })
    ).toBeInTheDocument()
  })

  it('opens the contact page of a card named new', () => {
    render(appRoutesTree(setupStore(), '/contacts/contacts/new'))

    expect(screen.getByText('Contact contacts/new')).toBeInTheDocument()
    expect(
      screen.queryByRole('textbox', { name: 'First name' })
    ).not.toBeInTheDocument()
  })

  it('renders the contact creation route of an address book', () => {
    render(appRoutesTree(setupStore(), '/contacts/new/book1'))

    expect(
      screen.getByRole('textbox', { name: 'First name' })
    ).toBeInTheDocument()
  })

  it('keeps the typed input when crossing the mobile breakpoint and back', () => {
    const store = setupStore()
    const { rerender } = render(appRoutesTree(store))
    fireEvent.change(screen.getByRole('textbox', { name: 'First name' }), {
      target: { value: 'Resize' }
    })

    setMobile(true)
    rerender(appRoutesTree(store))
    expect(screen.getByRole('textbox', { name: 'First name' })).toHaveValue(
      'Resize'
    )

    setMobile(false)
    rerender(appRoutesTree(store))

    expect(screen.getByRole('textbox', { name: 'First name' })).toHaveValue(
      'Resize'
    )
    expect(mockMount).toHaveBeenCalledTimes(1)
  })
})
