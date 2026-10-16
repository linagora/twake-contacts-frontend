import fr from '@common/locales/fr.json'
import { TwakeMuiThemeProvider } from '@linagora/twake-mui'
import { render, screen } from '@testing-library/react'
import I18n from 'twake-i18n'
import { UserAutocomplete } from './UserAutocomplete'

jest.mock('./useUserSearch', () => ({
  useUserSearch: () => ({ users: [], loading: false })
}))

describe('UserAutocomplete', () => {
  it('labels the popup indicator in the user language', () => {
    render(
      <TwakeMuiThemeProvider>
        <I18n dictRequire={() => fr} lang="fr">
          <UserAutocomplete onSelect={jest.fn()} onType={jest.fn()} />
        </I18n>
      </TwakeMuiThemeProvider>
    )

    expect(
      screen.getByRole('button', { name: fr.contacts.form.open })
    ).toBeInTheDocument()
  })
})
