import { render, RenderResult, screen } from '@testing-library/react'
import { Provider } from 'react-redux'
import { TwakeMuiThemeProvider } from '@linagora/twake-mui'
import I18n from 'twake-i18n'
import { setupStore } from '@common/app/store'
import { ThemeMode } from '@common/features/Settings/SettingsSlice'
import en from '@common/locales/en.json'
import { NoContactsEmptyState } from './NoContactsEmptyState'

const renderEmptyState = (themeMode: ThemeMode): RenderResult => {
  const store = setupStore({ settings: { language: 'en', themeMode } })
  return render(
    <Provider store={store}>
      <TwakeMuiThemeProvider>
        <I18n dictRequire={() => en} lang="en">
          <NoContactsEmptyState action={<button>Import</button>} />
        </I18n>
      </TwakeMuiThemeProvider>
    </Provider>
  )
}

const getIllustration = (container: HTMLElement): HTMLImageElement => {
  const img = container.querySelector('img')
  if (!img) {
    throw new Error('Illustration not found')
  }
  return img
}

describe('NoContactsEmptyState', () => {
  it('renders the title, subtitle and action', () => {
    renderEmptyState('light')

    expect(screen.getByText(en.contacts.empty.title)).toBeInTheDocument()
    expect(screen.getByText(en.contacts.empty.subtitle)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Import' })).toBeInTheDocument()
  })

  it('uses the light illustration in light mode', () => {
    const { container } = renderEmptyState('light')

    expect(getIllustration(container)).toHaveAttribute(
      'src',
      '/assets/images/svg/no-contact.svg'
    )
  })

  it('uses the dark illustration in dark mode', () => {
    const { container } = renderEmptyState('dark')

    expect(getIllustration(container)).toHaveAttribute(
      'src',
      '/assets/images/svg/no-contact-dark.svg'
    )
  })
})
