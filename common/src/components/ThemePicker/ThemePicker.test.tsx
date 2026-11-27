import { setupStore } from '@common/app/store'
import type { ThemeChoice } from '@common/features/Settings/SettingsSlice'
import en from '@common/locales/en.json'
import { aStoreState } from '@common/test/builders'
import { TwakeMuiThemeProvider } from '@linagora/twake-mui'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { Provider } from 'react-redux'
import I18n from 'twake-i18n'
import { ThemePicker } from './ThemePicker'

const mockConfig = vi.hoisted(() => ({ THEME_PICKER: true, DEBUG: false }))
vi.mock('@common/config', () => ({ config: mockConfig }))

const renderPicker = ({
  sharedTheme,
  themeOverride = null
}: {
  sharedTheme?: unknown
  themeOverride?: ThemeChoice | null
} = {}): ReturnType<typeof setupStore> => {
  const store = setupStore(
    aStoreState({
      user: {
        coreConfig: {
          language: null,
          datetime: { timeZone: null },
          theme: sharedTheme
        }
      },
      settings: { language: 'en', themeOverride }
    })
  )
  render(
    <Provider store={store}>
      <TwakeMuiThemeProvider>
        <I18n dictRequire={() => en} lang="en">
          <ThemePicker />
        </I18n>
      </TwakeMuiThemeProvider>
    </Provider>
  )
  return store
}

const openPicker = (): void => {
  fireEvent.click(screen.getByRole('button', { name: 'Theme' }))
}

const checkedTheme = (): string | null =>
  screen
    .getAllByRole('menuitemradio')
    .find(item => item.getAttribute('aria-checked') === 'true')?.textContent ??
  null

describe('ThemePicker', () => {
  beforeEach(() => localStorage.clear())

  it('offers every twake-mui scheme', () => {
    renderPicker()
    openPicker()

    expect(
      screen.getAllByRole('menuitemradio').map(item => item.textContent)
    ).toEqual(['Light', 'Dark', 'System', 'High contrast'])
  })

  it.each([
    ['light', 'Light'],
    ['dark', 'Dark'],
    ['auto', 'System']
  ])('checks the account theme %s', (sharedTheme, label) => {
    renderPicker({ sharedTheme })
    openPicker()

    expect(checkedTheme()).toBe(label)
  })

  it('checks the theme picked on this page over the account theme', () => {
    renderPicker({ sharedTheme: 'dark', themeOverride: 'contrast' })
    openPicker()

    expect(checkedTheme()).toBe('High contrast')
  })

  it.each([
    ['Dark', 'dark'],
    ['System', 'auto'],
    ['High contrast', 'contrast']
  ])(
    'switches to %s for this page only, without storing it',
    async (label, theme) => {
      const store = renderPicker({ sharedTheme: 'light' })
      openPicker()

      fireEvent.click(screen.getByRole('menuitemradio', { name: label }))

      expect(store.getState().settings.themeOverride).toBe(theme)
      expect(store.getState().user.coreConfig.theme).toBe('light')
      expect(localStorage.getItem('theme')).toBe(null)
      openPicker()
      await waitFor(() => expect(checkedTheme()).toBe(label))
    }
  )

  it('is shown with DEBUG alone', () => {
    mockConfig.THEME_PICKER = false
    mockConfig.DEBUG = true
    try {
      renderPicker()
      expect(screen.getByRole('button', { name: 'Theme' })).toBeInTheDocument()
    } finally {
      mockConfig.THEME_PICKER = true
      mockConfig.DEBUG = false
    }
  })

  it('is hidden when neither THEME_PICKER nor DEBUG is true', () => {
    mockConfig.THEME_PICKER = false
    try {
      renderPicker()
      expect(screen.queryByRole('button', { name: 'Theme' })).toBe(null)
    } finally {
      mockConfig.THEME_PICKER = true
    }
  })
})
