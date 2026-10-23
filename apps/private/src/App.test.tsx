import { render, screen } from '@testing-library/react'
import { Provider } from 'react-redux'
import * as Sentry from '@sentry/react'
import { setupStore } from '@common/app/store'
import { TwakeBarHeader } from '@common/components/TwakeBarHeader/TwakeBarHeader'
import App from './App'

jest.mock('@common/features/User/useInitializeApp', () => ({
  useInitializeApp: jest.fn()
}))
jest.mock('@linagora/twake-mui', () => ({
  TwakeMuiThemeProvider: ({ children }: { children: React.ReactNode }) =>
    children,
  Stack: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Box: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useColorScheme: () => ({ mode: 'light', setMode: jest.fn() })
}))
jest.mock('@sentry/react', () => ({ captureException: jest.fn() }))
jest.mock('@common/components/Error/Error', () => ({
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
jest.mock('@common/components/Loading/Loading', () => ({ Loading: () => null }))
jest.mock('@common/components/TwakeBarHeader/TwakeBarHeader', () => ({
  TwakeBarHeader: jest.fn(() => <div data-testid="header" />)
}))
jest.mock('@common/websocket/WebSocketGate', () => ({
  WebSocketGate: () => null
}))
jest.mock('./AppRoutes', () => ({
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
    jest.mocked(TwakeBarHeader).mockImplementation(() => {
      throw error
    })
    const consoleError = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {})
    try {
      render(
        <Provider store={setupStore()}>
          <App />
        </Provider>
      )
      expect(screen.getByRole('alert')).toHaveTextContent(error.message)
      expect(screen.queryByTestId('routes')).not.toBeInTheDocument()
      expect(Sentry.captureException).toHaveBeenCalledWith(error, {
        contexts: { react: { componentStack: expect.any(String) } }
      })
    } finally {
      consoleError.mockRestore()
      jest
        .mocked(TwakeBarHeader)
        .mockImplementation(() => <div data-testid="header" />)
    }
  })
})
