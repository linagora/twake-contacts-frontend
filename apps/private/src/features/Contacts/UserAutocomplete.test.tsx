import { fireEvent, render, screen } from '@testing-library/react'
import { Provider } from 'react-redux'
import { TwakeMuiThemeProvider } from '@linagora/twake-mui'
import I18n from 'twake-i18n'
import { setupStore } from '@common/app/store'
import { searchUsers } from '@common/features/Contacts/ContactsDao'
import { UserState } from '@common/features/User/UserSlice'
import { UserResult } from '@common/features/Contacts/contactsTypes'
import en from '@common/locales/en.json'
import fr from '@common/locales/fr.json'
import { UserAutocomplete } from './UserAutocomplete'

jest.mock('@common/features/Contacts/ContactsDao')

const mockedSearchUsers = searchUsers as jest.Mock

const carol: UserResult = {
  id: 'carol-id',
  displayName: 'carol',
  emails: [{ value: 'carol@open-paas.org' }]
}

function renderAutocomplete(
  onSelect = jest.fn(),
  onType = jest.fn(),
  locale: { lang: string; dict: typeof en } = { lang: 'en', dict: en }
): ReturnType<typeof render> {
  const store = setupStore({
    user: { userData: { openpaasId: 'u1' } } as UserState
  })

  return render(
    <Provider store={store}>
      <TwakeMuiThemeProvider>
        <I18n dictRequire={() => locale.dict} lang={locale.lang}>
          <UserAutocomplete onSelect={onSelect} onType={onType} />
        </I18n>
      </TwakeMuiThemeProvider>
    </Provider>
  )
}

async function pickCarol(): Promise<void> {
  fireEvent.change(screen.getByRole('combobox'), {
    target: { value: 'car' }
  })
  fireEvent.click(await screen.findByText('carol@open-paas.org'))
}

describe('UserAutocomplete', () => {
  beforeEach(() => {
    mockedSearchUsers.mockResolvedValue([carol])
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('labels the popup indicator in the user language', () => {
    renderAutocomplete(jest.fn(), jest.fn(), { lang: 'fr', dict: fr })

    expect(
      screen.getByRole('button', { name: fr.contacts.form.open })
    ).toBeInTheDocument()
  })

  it('labels the clear button in the user language', async () => {
    renderAutocomplete(jest.fn(), jest.fn(), { lang: 'fr', dict: fr })

    await pickCarol()

    // MUI hides the clear button with CSS until the field is hovered or
    // focused, so jsdom gives it no accessible name: match its aria-label
    expect(screen.getByLabelText(fr.contacts.form.clear)).toHaveAttribute(
      'type',
      'button'
    )
  })

  it('shows the email of each suggested user', async () => {
    renderAutocomplete()

    fireEvent.change(screen.getByRole('combobox'), {
      target: { value: 'car' }
    })

    expect(await screen.findByText('carol@open-paas.org')).toBeInTheDocument()
    expect(screen.getByText('carol')).toBeInTheDocument()
  })

  it('keeps the picked user in the field', async () => {
    const onSelect = jest.fn()
    renderAutocomplete(onSelect)

    await pickCarol()

    expect(onSelect).toHaveBeenCalledWith(carol)
    expect(screen.getByRole('combobox')).toHaveValue('carol')
    expect(screen.getByText('carol@open-paas.org')).toBeInTheDocument()
  })

  it('forgets the picked user when typing again', async () => {
    const onType = jest.fn()
    renderAutocomplete(jest.fn(), onType)
    await pickCarol()
    onType.mockClear()

    fireEvent.change(screen.getByRole('combobox'), {
      target: { value: 'caro' }
    })

    expect(onType).toHaveBeenCalled()
    expect(screen.getByRole('combobox')).toHaveValue('caro')
    expect(screen.queryByText('carol@open-paas.org')).not.toBeInTheDocument()
  })
})
