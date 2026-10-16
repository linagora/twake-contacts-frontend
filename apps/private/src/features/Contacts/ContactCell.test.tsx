import { act, fireEvent, render, screen } from '@testing-library/react'
import { Provider } from 'react-redux'
import {
  TwakeMuiThemeProvider,
  VirtualizedTableColumn,
  VirtualizedTableRow
} from '@linagora/twake-mui'
import I18n from 'twake-i18n'
import { setupStore } from '@common/app/store'
import { UserState } from '@common/features/User/UserSlice'
import deLocale from '@common/locales/de.json'
import enLocale from '@common/locales/en.json'
import esLocale from '@common/locales/es.json'
import frLocale from '@common/locales/fr.json'
import itLocale from '@common/locales/it.json'
import ruLocale from '@common/locales/ru.json'
import viLocale from '@common/locales/vi.json'
import { ContactCell } from './ContactCell'

const locales = {
  de: deLocale,
  en: enLocale,
  es: esLocale,
  fr: frLocale,
  it: itLocale,
  ru: ruLocale,
  vi: viLocale
}

const row = {
  addressBookId: 'ab1',
  contact: {
    id: 'c1',
    displayName: 'Anna Default',
    emails: [{ type: null, value: 'anna@example.com' }]
  }
} as unknown as VirtualizedTableRow

const column = { id: 'contact.displayName' } as VirtualizedTableColumn

const renderCell = (lang: keyof typeof locales): void => {
  const store = setupStore({
    user: { userData: { openpaasId: 'u1' } } as UserState
  })
  render(
    <Provider store={store}>
      <TwakeMuiThemeProvider>
        <I18n dictRequire={() => locales[lang]} lang={lang}>
          <ContactCell row={row} column={column} />
        </I18n>
      </TwakeMuiThemeProvider>
    </Provider>
  )
}

describe('ContactCell', () => {
  beforeEach(() => {
    window.MAIL_SPA_URL = 'https://mail.example.com'
  })

  afterEach(() => {
    delete window.MAIL_SPA_URL
  })

  it.each(Object.keys(locales) as (keyof typeof locales)[])(
    'labels the popover email action like the row menu in %s',
    lang => {
      renderCell(lang)

      fireEvent.click(screen.getByText('Anna Default'))

      expect(
        screen.getByRole('link', { name: locales[lang].contacts.menu.sendMail })
      ).toBeInTheDocument()
    }
  )

  describe('name popover', () => {
    const sendMailLink = (): HTMLElement | null =>
      screen.queryByRole('link', { name: enLocale.contacts.menu.sendMail })

    const hoverName = (): void => {
      fireEvent.mouseEnter(screen.getByText('Anna Default'))
      act(() => {
        jest.advanceTimersByTime(1000)
      })
    }

    const pressEscape = (): void => {
      fireEvent.keyDown(screen.getByRole('presentation'), { key: 'Escape' })
      act(() => {
        jest.advanceTimersByTime(1000)
      })
    }

    beforeEach(() => {
      jest.useFakeTimers()
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    it('does not reopen after Escape while the pointer is still on the name', () => {
      renderCell('en')
      hoverName()
      expect(sendMailLink()).toBeInTheDocument()

      pressEscape()
      hoverName()

      expect(sendMailLink()).not.toBeInTheDocument()
    })

    it('opens again on hover once the pointer has left the name', () => {
      renderCell('en')
      hoverName()
      pressEscape()

      fireEvent.mouseMove(document.body)
      hoverName()

      expect(sendMailLink()).toBeInTheDocument()
    })

    it('stays closed while the pointer moves over the name after Escape', () => {
      renderCell('en')
      hoverName()
      pressEscape()

      fireEvent.mouseMove(screen.getByText('Anna Default'))
      hoverName()

      expect(sendMailLink()).not.toBeInTheDocument()
    })
  })
})
