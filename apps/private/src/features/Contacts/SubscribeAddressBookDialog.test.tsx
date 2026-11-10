import type { Mock } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TwakeMuiThemeProvider } from '@linagora/twake-mui'
import I18n from 'twake-i18n'
import en from '@common/locales/en.json'
import { SubscribeAddressBookDialog } from './SubscribeAddressBookDialog'

vi.mock('./UserAutocomplete', () => ({
  UserAutocomplete: ({
    labelledBy
  }: {
    labelledBy?: string
  }): React.ReactElement => (
    <input role="combobox" aria-labelledby={labelledBy} />
  )
}))

vi.mock('./usePublicAddressBooks', () => ({
  usePublicAddressBooks: () => ({
    user: null,
    selectUser: vi.fn(),
    clearUser: vi.fn(),
    books: [],
    emptyMessageKey: null,
    removeBook: vi.fn()
  })
}))

function renderDialog(onClose = vi.fn()): Mock {
  render(
    <TwakeMuiThemeProvider>
      <I18n dictRequire={() => en} lang="en">
        <SubscribeAddressBookDialog onClose={onClose} onConfirm={vi.fn()} />
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

  it('labels the user field with the visible sentence', () => {
    renderDialog()

    expect(
      screen.getByRole('combobox', {
        name: 'Search for a user to see their address books'
      })
    ).toBeInTheDocument()
  })

  it('does not render the title as a list item', () => {
    renderDialog()

    expect(screen.queryByRole('listitem')).not.toBeInTheDocument()
  })

  it('pins the close button to the dialog corner, outside of the title', () => {
    renderDialog()

    const closeButton = screen.getByRole('button', { name: 'Close' })
    const heading = screen.getByRole('heading', {
      name: 'Add a shared address book'
    })
    expect(closeButton).toHaveClass('dialogCloseButton')
    expect(heading).toHaveClass('dialogTitleWithClose')
    expect(heading).not.toContainElement(closeButton)
    expect(closeButton.parentElement).toBe(heading.parentElement)
  })

  it('closes from the close button', async () => {
    const user = userEvent.setup()
    const onClose = renderDialog()

    await user.click(screen.getByRole('button', { name: 'Close' }))

    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
