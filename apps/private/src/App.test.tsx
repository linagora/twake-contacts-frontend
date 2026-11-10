import { render, screen } from '@testing-library/react'
import { Provider } from 'react-redux'
import * as Sentry from '@sentry/react'
import { setupStore } from '@common/app/store'
import { TwakeBarHeader } from '@common/components/TwakeBarHeader/TwakeBarHeader'
import App from './App'

vi.mock('@common/features/User/useInitializeApp', () => ({
  useInitializeApp: vi.fn()
}))
vi.mock('@linagora/twake-mui', () => ({
  TwakeMuiThemeProvider: ({ children }: { children: React.ReactNode }) =>
    children,
  Stack: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Box: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useColorScheme: () => ({ mode: 'light', setMode: vi.fn() })
}))
vi.mock('@sentry/react', () => ({ captureException: vi.fn() }))
vi.mock('@common/components/Error/Error', () => ({
  Error: ({
    isCrashFallback,
    errorBoundaryMessage
  }: {
    isCrashFallback: boolean
    errorBoundaryMessage: Error
  }) => (
    <div role="alert">{isCrashFallback && errorBoundaryMessage.message}</div>
  )
}))
vi.mock('@common/components/Loading/Loading', () => ({ Loading: () => null }))
vi.mock('@common/components/TwakeBarHeader/TwakeBarHeader', () => ({
  TwakeBarHeader: vi.fn(() => <div data-testid="header" />)
}))
vi.mock('@common/websocket/WebSocketGate', () => ({
  WebSocketGate: () => null
}))
vi.mock('./AppRoutes', () => ({
  AppRoutes: () => <div data-testid="routes" />
}))

describe('App error boundary', () => {
  it('renders the header and routed content normally', () => {
    render(
      <Provider store={setupStore()}>
        <App />
      </Provider>
    )
    expect(screen.getByTestId('header')).toBeInTheDocument()
    expect(screen.getByTestId('routes')).toBeInTheDocument()
  })

  it('shows the crash fallback and reports header render errors to Sentry', () => {
    const error = new Error('Header render failed')
    vi.mocked(TwakeBarHeader).mockImplementation(() => {
      throw error
    })
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      render(
        <Provider store={setupStore()}>
          <App />
        </Provider>
      )
      expect(screen.getByRole('alert')).toHaveTextContent(error.message)
      expect(screen.queryByTestId('routes')).not.toBeInTheDocument()
      expect(Sentry.captureException).toHaveBeenCalledWith(error, {
        contexts: { react: { componentStack: expect.any(String) as unknown } }
      })
    } finally {
      consoleError.mockRestore()
      vi.mocked(TwakeBarHeader).mockImplementation(() => (
        <div data-testid="header" />
      ))
    }
  })
})
