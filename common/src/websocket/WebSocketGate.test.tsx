import { setupStore } from '@common/app/store'
import type { TokenSet } from '@linagora/twake-oidc'
import { render } from '@testing-library/react'
import { Provider } from 'react-redux'
import { WebSocketGate } from './WebSocketGate'

const mockConfig = vi.hoisted((): { WEBSOCKET_URL: string | undefined } => ({
  WEBSOCKET_URL: undefined
}))
vi.mock('@common/config', () => ({ config: mockConfig }))

const mockUseWebSocketConnection = vi.hoisted(() =>
  vi.fn(() => ({ socketRef: { current: null }, isOpen: false, epoch: 0 }))
)
vi.mock('@linagora/twake-websocket', () => ({
  useWebSocketConnection: mockUseWebSocketConnection
}))

const renderGate = (authenticated: boolean): void => {
  const initialState = setupStore().getState()
  const store = setupStore({
    ...initialState,
    user: {
      ...initialState.user,
      tokens: authenticated ? ({ id_token: 'token' } as TokenSet) : null
    }
  })
  render(
    <Provider store={store}>
      <WebSocketGate />
    </Provider>
  )
}

const lastEnabled = (): boolean | undefined =>
  (
    mockUseWebSocketConnection.mock.lastCall as unknown as
      [{ enabled: boolean; url: string }] | undefined
  )?.[0].enabled

describe('WebSocketGate', () => {
  beforeEach(() => {
    mockUseWebSocketConnection.mockClear()
  })

  it('does not enable the connection when WEBSOCKET_URL is not configured', () => {
    mockConfig.WEBSOCKET_URL = undefined

    renderGate(true)

    expect(lastEnabled()).toBe(false)
  })

  it('enables the connection when signed in and WEBSOCKET_URL is configured', () => {
    mockConfig.WEBSOCKET_URL = 'wss://ws.example.com'

    renderGate(true)

    expect(lastEnabled()).toBe(true)
    expect(mockUseWebSocketConnection).toHaveBeenLastCalledWith(
      expect.objectContaining({ url: 'wss://ws.example.com' })
    )
  })

  it('does not enable the connection when signed out', () => {
    mockConfig.WEBSOCKET_URL = 'wss://ws.example.com'

    renderGate(false)

    expect(lastEnabled()).toBe(false)
  })
})
