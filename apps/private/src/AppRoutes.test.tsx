import { fireEvent, render, screen } from '@testing-library/react'
import { Provider } from 'react-redux'
import { MemoryRouter } from 'react-router'
import { TwakeMuiThemeProvider, useBreakpoints } from '@linagora/twake-mui'
import I18n from 'twake-i18n'
import { setupStore } from '@common/app/store'
import en from '@common/locales/en.json'
import { AppRoutes } from './AppRoutes'

const mockMount = jest.fn()

jest.mock('@linagora/twake-mui', () => ({
  ...jest.requireActual('@linagora/twake-mui'),
  useBreakpoints: jest.fn()
}))

jest.mock('./features/Contacts/ContactsPage', () => {
  const { useEffect } = jest.requireActual('react')
  const { Outlet } = jest.requireActual('react-router')
  return {
    ContactsPage: () => {
      useEffect(() => mockMount(), [])
      return <Outlet />
    }
  }
})

jest.mock('./features/Contacts/CreateContactPage', () => ({
  CreateContactPage: () => <input aria-label="First name" />
}))

const mockUseBreakpoints = useBreakpoints as jest.MockedFunction<
  typeof useBreakpoints
>

const setMobile = (isMobile: boolean): void => {
  mockUseBreakpoints.mockReturnValue({ isMobile } as ReturnType<
    typeof useBreakpoints
  >)
}

const appRoutesTree = (store = setupStore()) => (
  <Provider store={store}>
    <TwakeMuiThemeProvider>
      <I18n dictRequire={() => en} lang="en">
        <MemoryRouter initialEntries={['/contacts/new']}>
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

  it('shows the mobile placeholder and hides the routes on mobile', () => {
    setMobile(true)
    render(appRoutesTree())

    expect(screen.getByText(en.mobile.comingSoon.title)).toBeInTheDocument()
    expect(
      screen.queryByRole('textbox', { name: 'First name' })
    ).not.toBeInTheDocument()
  })

  it('keeps the typed input when crossing the mobile breakpoint and back', () => {
    const store = setupStore()
    const { rerender } = render(appRoutesTree(store))
    fireEvent.change(screen.getByRole('textbox', { name: 'First name' }), {
      target: { value: 'Resize' }
    })

    setMobile(true)
    rerender(appRoutesTree(store))
    expect(screen.getByText(en.mobile.comingSoon.title)).toBeInTheDocument()

    setMobile(false)
    rerender(appRoutesTree(store))

    expect(
      screen.queryByText(en.mobile.comingSoon.title)
    ).not.toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'First name' })).toHaveValue(
      'Resize'
    )
    expect(mockMount).toHaveBeenCalledTimes(1)
  })
})
