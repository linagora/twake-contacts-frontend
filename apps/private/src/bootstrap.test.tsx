import { loadConfig } from '@common/config'
import { act, screen } from '@testing-library/react'
import { createRoot, type Root } from 'react-dom/client'
import { bootstrap } from './bootstrap'

const VALID_SOURCE = {
  SSO_BASE_URL: 'https://sso.example.com',
  SSO_CLIENT_ID: 'contacts',
  SSO_SCOPE: 'openid profile email',
  SSO_REDIRECT_URI: 'https://contacts.example.com/callback',
  SIDE_SERVICE_BASE_URL: 'https://api.example.com'
}

describe('bootstrap', () => {
  let root: Root
  const startApp = vi.fn(() => <p>The app</p>)

  beforeEach(() => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    document.body.innerHTML = ''
  })

  const start = (source: Record<string, unknown>): void => {
    act(() => bootstrap(root, loadConfig(source), startApp))
  }

  it('starts the app when the configuration is valid', () => {
    start(VALID_SOURCE)

    expect(startApp).toHaveBeenCalledWith(expect.objectContaining(VALID_SOURCE))
    expect(screen.getByText('The app')).toBeInTheDocument()
  })

  it('names the missing setting instead of starting the app', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    start({ ...VALID_SOURCE, SIDE_SERVICE_BASE_URL: undefined })

    expect(startApp).not.toHaveBeenCalled()
    expect(
      screen.getByRole('heading', { name: 'The application is misconfigured' })
    ).toBeInTheDocument()
    expect(
      screen.getByText('SIDE_SERVICE_BASE_URL is missing')
    ).toBeInTheDocument()
    expect(error).toHaveBeenCalledWith(
      expect.stringContaining('Invalid runtime configuration'),
      [{ name: 'SIDE_SERVICE_BASE_URL', reason: 'missing' }]
    )
  })

  it('names the malformed settings in the configured language', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})

    start({ ...VALID_SOURCE, SSO_BASE_URL: 'sso', LANG: 'fr' })

    expect(screen.getByText('SSO_BASE_URL est invalide')).toBeInTheDocument()
  })
})
