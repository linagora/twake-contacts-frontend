import { render, RenderResult, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TwakeMuiThemeProvider } from '@linagora/twake-mui'
import I18n from 'twake-i18n'
import en from '@common/locales/en.json'
import { Contact } from '@common/features/Contacts/contactsTypes'
import { DeleteContactDialog } from './DeleteContactDialog'

const contact: Contact = {
  id: 'c1',
  displayName: 'Amélie Bianchi',
  emails: [{ type: 'work', value: 'amelie@example.com' }]
}

const renderDialog = (
  onConfirm: () => void = vi.fn(),
  onClose: () => void = vi.fn()
): RenderResult =>
  render(
    <TwakeMuiThemeProvider>
      <I18n dictRequire={() => en} lang="en">
        <DeleteContactDialog
          contact={contact}
          onClose={onClose}
          onConfirm={onConfirm}
        />
      </I18n>
    </TwakeMuiThemeProvider>
  )

type Registration = [string, EventListenerOrEventListenerObject]

const listenersStillRegistered = (
  added: Registration[],
  removed: Registration[]
): Registration[] =>
  added.filter(
    ([type, listener]) =>
      !removed.some(
        ([removedType, removedListener]) =>
          removedType === type && removedListener === listener
      )
  )

describe('DeleteContactDialog', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('shows the contact to delete', () => {
    renderDialog()

    expect(screen.getByText(en.contacts.delete.title)).toBeInTheDocument()
    expect(screen.getByText('Amélie Bianchi')).toBeInTheDocument()
    expect(screen.getByText('amelie@example.com')).toBeInTheDocument()
  })

  it('confirms the deletion', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    renderDialog(onConfirm)

    await user.click(
      screen.getByRole('button', { name: en.contacts.delete.confirm })
    )

    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('closes without deleting on cancel', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    const onClose = vi.fn()
    renderDialog(onConfirm, onClose)

    await user.click(
      screen.getByRole('button', { name: en.contacts.form.cancel })
    )

    expect(onClose).toHaveBeenCalledTimes(1)
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('removes every window listener it adds once closed (#665)', () => {
    const addSpy = vi.spyOn(window, 'addEventListener')
    const removeSpy = vi.spyOn(window, 'removeEventListener')

    Array.from({ length: 3 }).forEach(() => renderDialog().unmount())

    const added = addSpy.mock.calls.map(
      ([type, listener]) => [type, listener] as Registration
    )
    const removed = removeSpy.mock.calls.map(
      ([type, listener]) => [type, listener] as Registration
    )
    expect(listenersStillRegistered(added, removed)).toEqual([])
  })
})
