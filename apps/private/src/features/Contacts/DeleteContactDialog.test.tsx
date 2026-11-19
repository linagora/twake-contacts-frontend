import { fireEvent, render, screen } from '@testing-library/react'
import { TwakeMuiThemeProvider } from '@linagora/twake-mui'
import I18n from 'twake-i18n'
import en from '@common/locales/en.json'
import { DeleteContactDialog } from './DeleteContactDialog'

const contact = {
  id: 'c1',
  displayName: 'Amélie Bianchi',
  emails: [{ type: 'work', value: 'amelie@example.com' }]
}

const renderDialog = (
  onClose = vi.fn(),
  onConfirm = vi.fn()
): ReturnType<typeof render> =>
  render(
    <TwakeMuiThemeProvider>
      <I18n lang="en" dictRequire={() => en}>
        <DeleteContactDialog
          contact={contact}
          onClose={onClose}
          onConfirm={onConfirm}
        />
      </I18n>
    </TwakeMuiThemeProvider>
  )

describe('DeleteContactDialog', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('shows the contact to delete', () => {
    renderDialog()

    expect(screen.getByText('Amélie Bianchi')).toBeInTheDocument()
    expect(screen.getByText('amelie@example.com')).toBeInTheDocument()
  })

  it('confirms and cancels through its buttons', () => {
    const onClose = vi.fn()
    const onConfirm = vi.fn()
    renderDialog(onClose, onConfirm)

    fireEvent.click(
      screen.getByRole('button', { name: en.contacts.delete.confirm })
    )
    fireEvent.click(
      screen.getByRole('button', { name: en.contacts.form.cancel })
    )

    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('removes every window listener it adds once closed, whatever the number of openings', () => {
    const added = vi.spyOn(window, 'addEventListener')
    const removed = vi.spyOn(window, 'removeEventListener')

    Array.from({ length: 5 }).forEach(() => renderDialog().unmount())

    const stillRegistered = added.mock.calls.filter(
      ([type, listener]) =>
        !removed.mock.calls.some(
          ([removedType, removedListener]) =>
            removedType === type && removedListener === listener
        )
    )
    expect(stillRegistered.map(([type]) => type)).toEqual([])
  })
})
