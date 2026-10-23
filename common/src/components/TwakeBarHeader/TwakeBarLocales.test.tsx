import { fireEvent, render, screen } from '@testing-library/react'
import { TwakeBar } from '@linagora/twake-bar'
import { TwakeMuiThemeProvider } from '@linagora/twake-mui'
import I18n from 'twake-i18n'
import de from '@common/locales/de.json'
import en from '@common/locales/en.json'
import es from '@common/locales/es.json'
import fr from '@common/locales/fr.json'
import italian from '@common/locales/it.json'
import ru from '@common/locales/ru.json'
import vi from '@common/locales/vi.json'

const locales = { de, en, es, fr, it: italian, ru, vi }

it.each([
  ['de', 'Konto', 'Abmelden'],
  ['en', 'Account', 'Log out'],
  ['es', 'Cuenta', 'Cerrar sesión'],
  ['fr', 'Compte', 'Se déconnecter'],
  ['it', 'Account', 'Esci'],
  ['ru', 'Аккаунт', 'Выйти'],
  ['vi', 'Tài khoản', 'Đăng xuất']
])('renders the bar account menu in %s', (lang, account, logout) => {
  render(
    <TwakeMuiThemeProvider>
      <I18n
        dictRequire={() => locales[lang as keyof typeof locales]}
        lang={lang}
      >
        <TwakeBar
          app={{ slug: 'contacts', name: 'Contacts', icon: '/contacts.svg' }}
          onLogOut={jest.fn()}
          fallback={{ user: { name: 'Alice Doe', email: 'alice@example.com' } }}
        />
      </I18n>
    </TwakeMuiThemeProvider>
  )
  fireEvent.click(screen.getByRole('button', { name: account }))
  expect(screen.getByTestId('twake-bar-logout')).toHaveTextContent(logout)
})
