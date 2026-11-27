import { setupStore } from '@common/app/store'
import { ThemeSync } from '@common/features/Settings/ThemeSync'
import en from '@common/locales/en.json'
import { aStoreState } from '@common/test/builders'
import { TwakeMuiThemeProvider } from '@linagora/twake-mui'
import { fireEvent, render, screen } from '@testing-library/react'
import { Provider } from 'react-redux'
import I18n from 'twake-i18n'
import { ThemeToggle } from './ThemeToggle'

const renderToggle = (sharedTheme?: unknown): ReturnType<typeof setupStore> => {
  const store = setupStore(
    aStoreState({
      user: {
        coreConfig: {
          language: null,
          datetime: { timeZone: null },
          theme: sharedTheme
        }
      }
    })
  )
  render(
    <Provider store={store}>
      <TwakeMuiThemeProvider>
        <ThemeSync />
        <I18n dictRequire={() => en} lang="en">
          <ThemeToggle />
        </I18n>
      </TwakeMuiThemeProvider>
    </Provider>
  )
  return store
}

describe('ThemeToggle', () => {
  beforeEach(() => localStorage.clear())

  it('switches the theme for this page only, without storing it', () => {
    const store = renderToggle()

    fireEvent.click(screen.getByRole('button', { name: 'Dark mode' }))

    expect(store.getState().settings.themeOverride).toBe('dark')
    expect(
      screen.getByRole('button', { name: 'Light mode' })
    ).toBeInTheDocument()
    expect(store.getState().user.coreConfig.theme).toBe(undefined)
    expect(localStorage.getItem('theme')).toBe(null)
  })

  it('starts from the shared theme', () => {
    renderToggle('dark')

    expect(
      screen.getByRole('button', { name: 'Light mode' })
    ).toBeInTheDocument()
  })

  it('overrides the shared theme, which it leaves as it is', () => {
    const store = renderToggle('dark')

    fireEvent.click(screen.getByRole('button', { name: 'Light mode' }))

    expect(
      screen.getByRole('button', { name: 'Dark mode' })
    ).toBeInTheDocument()
    expect(store.getState().user.coreConfig.theme).toBe('dark')
  })

  it('ignores a shared theme it does not know', () => {
    renderToggle('sepia')

    expect(
      screen.getByRole('button', { name: 'Dark mode' })
    ).toBeInTheDocument()
  })
})
