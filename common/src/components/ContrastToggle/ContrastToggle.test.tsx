import { setupStore } from '@common/app/store'
import { highContrastThemeOptions } from '@common/features/Settings/highContrastTheme'
import en from '@common/locales/en.json'
import { Typography, TwakeMuiThemeProvider } from '@linagora/twake-mui'
import { fireEvent, render, screen } from '@testing-library/react'
import { Provider } from 'react-redux'
import I18n from 'twake-i18n'
import { ContrastToggle } from './ContrastToggle'

const renderToggle = (contrastMode: 'default' | 'more' = 'default') => {
  const store = setupStore({
    settings: { language: 'en', themeMode: 'light', contrastMode }
  })
  render(
    <Provider store={store}>
      <TwakeMuiThemeProvider>
        <I18n dictRequire={() => en} lang="en">
          <ContrastToggle />
        </I18n>
      </TwakeMuiThemeProvider>
    </Provider>
  )
  return store
}

describe('ContrastToggle', () => {
  beforeEach(() => localStorage.clear())

  it('is a "High contrast" toggle button, not pressed by default', () => {
    renderToggle()

    const button = screen.getByRole('button', { name: 'High contrast' })
    expect(button).toHaveAttribute('aria-pressed', 'false')
  })

  it('switches high contrast on and remembers it', () => {
    const store = renderToggle()

    fireEvent.click(screen.getByRole('button', { name: 'High contrast' }))

    expect(store.getState().settings.contrastMode).toBe('more')
    expect(localStorage.getItem('contrast')).toBe('more')
    expect(
      screen.getByRole('button', { name: 'High contrast' })
    ).toHaveAttribute('aria-pressed', 'true')
  })

  it('switches high contrast off', () => {
    const store = renderToggle('more')

    fireEvent.click(screen.getByRole('button', { name: 'High contrast' }))

    expect(store.getState().settings.contrastMode).toBe('default')
    expect(localStorage.getItem('contrast')).toBe('default')
  })
})

describe('highContrastThemeOptions', () => {
  it('builds a theme whose primary text uses the high-contrast colour', () => {
    render(
      <TwakeMuiThemeProvider themeOptions={highContrastThemeOptions}>
        <Typography color="textPrimary">Alice</Typography>
      </TwakeMuiThemeProvider>
    )

    const style = Array.from(document.querySelectorAll('style'))
      .map(node => node.textContent)
      .join('\n')
    expect(style).toContain('#1B1B1D')
    expect(style).toContain('3px solid #0047B3')
  })
})
