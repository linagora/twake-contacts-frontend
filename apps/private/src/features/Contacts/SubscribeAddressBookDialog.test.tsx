import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TwakeMuiThemeProvider } from '@linagora/twake-mui'
import I18n from 'twake-i18n'
import en from '@common/locales/en.json'
import { SubscribeAddressBookDialog } from './SubscribeAddressBookDialog'

jest.mock('./UserAutocomplete', () => ({
  UserAutocomplete: () => null
}))

jest.mock('./usePublicAddressBooks', () => ({
  usePublicAddressBooks: () => ({
    user: null,
    selectUser: jest.fn(),
    clearUser: jest.fn(),
    books: [],
    emptyMessageKey: null,
    removeBook: jest.fn()
  })
}))

function renderDialog(onClose = jest.fn()): jest.Mock {
  render(
    <TwakeMuiThemeProvider>
      <I18n dictRequire={() => en} lang="en">
        <SubscribeAddressBookDialog onClose={onClose} onConfirm={jest.fn()} />
      </I18n>
    </TwakeMuiThemeProvider>
  )
  return onClose
}

describe('SubscribeAddressBookDialog', () => {
  it('names the heading and the dialog with the title only', () => {
    renderDialog()

    expect(
      screen.getByRole('heading', { name: 'Add a shared address book' })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('dialog', { name: 'Add a shared address book' })
    ).toBeInTheDocument()
  })

  it('does not render the title as a list item', () => {
    renderDialog()

    expect(screen.queryByRole('listitem')).not.toBeInTheDocument()
  })

  it('closes from the close button', async () => {
    const onClose = renderDialog()

    await userEvent.click(screen.getByRole('button', { name: 'Close' }))

    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
