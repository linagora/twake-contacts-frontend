import { setupStore } from '@common/app/store'
import { aStoreState } from '@common/test/builders'
import { TwakeMuiThemeProvider, useColorScheme } from '@linagora/twake-mui'
import { render, screen } from '@testing-library/react'
import { Provider } from 'react-redux'
import type { ThemeChoice } from './SettingsSlice'
import { ThemeSync } from './ThemeSync'

function ModeProbe(): React.JSX.Element {
  const { mode, colorScheme } = useColorScheme()
  return (
    <>
      <span data-testid="mode">{mode}</span>
      <span data-testid="scheme">
        {colorScheme === 'contrast' && 'contrast'}
      </span>
    </>
  )
}

const renderSync = ({
  sharedTheme,
  themeOverride = null
}: {
  sharedTheme?: unknown
  themeOverride?: ThemeChoice | null
}): void => {
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
        <ThemeSync />
        <ModeProbe />
      </TwakeMuiThemeProvider>
    </Provider>
  )
}

describe('ThemeSync', () => {
  beforeEach(() => localStorage.clear())

  it('applies the shared theme, without storing it', async () => {
    renderSync({ sharedTheme: 'dark' })

    expect(await screen.findByText('dark')).toBeInTheDocument()
    expect(localStorage.getItem('theme')).toBe(null)
  })

  it('follows the system for the shared "auto" theme', async () => {
    renderSync({ sharedTheme: 'auto' })

    expect(await screen.findByText('system')).toBeInTheDocument()
  })

  it('is light while no shared theme is known', async () => {
    renderSync({})

    expect(await screen.findByText('light')).toBeInTheDocument()
  })

  it('lets the debug theme picker win over the shared theme', async () => {
    renderSync({ sharedTheme: 'dark', themeOverride: 'light' })

    expect(await screen.findByText('light')).toBeInTheDocument()
  })

  it('applies the twake-mui contrast scheme in high contrast', async () => {
    renderSync({ sharedTheme: 'dark', themeOverride: 'contrast' })

    expect(await screen.findByText('contrast')).toBeInTheDocument()
  })
})
