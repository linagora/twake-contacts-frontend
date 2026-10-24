import { useState } from 'react'
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within
} from '@testing-library/react'
import { Provider } from 'react-redux'
import { TwakeMuiThemeProvider } from '@linagora/twake-mui'
import I18n from 'twake-i18n'
import { setupStore } from '@common/app/store'
import { copyContact, moveContact } from '@common/features/Contacts/ContactsDao'
import {
  copyContact as copyContactAction,
  moveContact as moveContactAction
} from '@common/features/Contacts/ContactsSlice'
import { AddressBookWithContacts } from '@common/features/Contacts/contactsTypes'
import { UserState } from '@common/features/User/UserSlice'
import en from '@common/locales/en.json'
import { ContactTransferSnackbar } from './ContactTransferSnackbar'
import { ContactTransferDialog } from './CopyContactDialog'

jest.mock('@common/features/Contacts/ContactsDao')

const contact = { id: 'c1', displayName: 'Alice', emails: [] }
const book = (id: string, canWrite = true): AddressBookWithContacts => ({
  id,
  userId: `owner-${id}`,
  name: id,
  canWrite,
  acl: [],
  contactsCount: 0,
  contacts: []
})
const renderDialog = (
  mode: 'copy' | 'move' = 'copy',
  sourceCanWrite = true
): {
  store: ReturnType<typeof setupStore>
  onClose: jest.Mock
} => {
  const store = setupStore({
    user: { userData: { openpaasId: 'u1' } } as UserState,
    contacts: {
      addressBooks: {
        source: {
          ...book('source', sourceCanWrite),
          contacts: [contact],
          contactsCount: 1
        },
        target: book('target'),
        dab: book('dab'),
        collected: book('collected'),
        readonly: book('readonly', false),
        contacts: { ...book('contacts'), name: 'My contacts' },
        shared: {
          ...book('shared'),
          name: 'Alpha Shared',
          ownerId: 'u2',
          ownerDisplayName: 'Bob Owner'
        }
      },
      listings: {},
      loading: false,
      error: null
    }
  })
  const onClose = jest.fn()
  const DialogHarness = (): React.ReactElement => {
    const [open, setOpen] = useState(true)
    return (
      <>
        {open && (
          <ContactTransferDialog
            mode={mode}
            contact={contact}
            addressBookId="source"
            onClose={() => {
              onClose()
              setOpen(false)
            }}
          />
        )}
        <ContactTransferSnackbar />
      </>
    )
  }
  render(
    <Provider store={store}>
      <TwakeMuiThemeProvider>
        <I18n dictRequire={() => en} lang="en">
          <DialogHarness />
        </I18n>
      </TwakeMuiThemeProvider>
    </Provider>
  )
  return { store, onClose }
}
const selectDestination = (name = 'target'): void => {
  fireEvent.mouseDown(screen.getByRole('combobox'))
  expect(screen.queryByRole('option', { name: 'dab' })).not.toBeInTheDocument()
  expect(
    screen.queryByRole('option', { name: 'collected' })
  ).not.toBeInTheDocument()
  expect(
    screen.queryByRole('option', { name: 'readonly' })
  ).not.toBeInTheDocument()
  expect(
    screen.queryByRole('option', { name: 'source' })
  ).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('option', { name }))
}

it.each(['copy', 'move'] as const)(
  'blocks %s from a read-only shared source before calling the API',
  async mode => {
    jest.clearAllMocks()
    const { store } = renderDialog(mode, false)
    selectDestination()
    expect(
      screen.getByRole('button', { name: mode === 'copy' ? 'Copy' : 'Move' })
    ).toBeDisabled()
    const args = {
      fromAddressBookId: 'source',
      toAddressBookId: 'target',
      contact
    }
    const action =
      mode === 'copy'
        ? await store.dispatch(copyContactAction(args))
        : await store.dispatch(
            moveContactAction({ ...args, userId: 'owner-source' })
          )
    expect(action.meta.requestStatus).toBe('rejected')
    expect(copyContact).not.toHaveBeenCalled()
    expect(moveContact).not.toHaveBeenCalled()
    expect(store.getState().contacts.addressBooks.source.contacts).toEqual([
      contact
    ])
    expect(store.getState().contacts.addressBooks.target.contacts).toEqual([])
  }
)

const transferCases = [
  {
    mode: 'copy',
    dao: copyContact,
    label: 'Copy',
    messages: en.contacts.copyContact
  },
  {
    mode: 'move',
    dao: moveContact,
    label: 'Move',
    messages: en.contacts.moveContact
  }
] as const

it.each(transferCases)(
  'transfers with $mode and updates the appropriate books',
  async ({ mode, dao, label, messages }) => {
    jest.clearAllMocks()
    jest.mocked(copyContact).mockResolvedValue('new-card-id')
    jest.mocked(moveContact).mockResolvedValue()
    const { store, onClose } = renderDialog(mode)
    expect(screen.getByRole('button', { name: label })).toBeDisabled()
    selectDestination()
    fireEvent.click(screen.getByRole('button', { name: label }))
    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(screen.getByRole('alert')).toHaveTextContent(messages.success)
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(store.getState().contacts.transferSuccess).toBeNull()
    expect(dao).toHaveBeenCalledWith(
      { userId: 'owner-source', addressBookId: 'source' },
      { userId: 'owner-target', addressBookId: 'target' },
      'c1'
    )
    const books = store.getState().contacts.addressBooks
    expect(books.source.contacts).toEqual(mode === 'copy' ? [contact] : [])
    expect(books.source.contactsCount).toBe(mode === 'copy' ? 1 : 0)
    expect(books.target.contacts).toEqual([
      { ...contact, id: mode === 'copy' ? 'new-card-id' : contact.id }
    ])
    expect(books.target.contactsCount).toBe(1)
  }
)

it.each(transferCases)(
  'preserves both books and allows retry when $mode fails',
  async ({ mode, dao, label, messages }) => {
    jest.clearAllMocks()
    jest.mocked(dao).mockRejectedValue(new Error('Transfer failed'))
    const { store, onClose } = renderDialog(mode)
    const before = store.getState().contacts.addressBooks
    selectDestination()
    fireEvent.click(screen.getByRole('button', { name: label }))
    expect(await screen.findByRole('alert')).toHaveTextContent(messages.error)
    expect(onClose).not.toHaveBeenCalled()
    expect(store.getState().contacts.transferSuccess).toBeUndefined()
    expect(store.getState().contacts.addressBooks).toEqual(before)
    expect(screen.getByRole('combobox')).toHaveTextContent('target')
    expect(screen.getByRole('button', { name: label })).toBeEnabled()
    fireEvent.click(screen.getByRole('button', { name: label }))
    await waitFor(() => expect(dao).toHaveBeenCalledTimes(2))
    expect(onClose).not.toHaveBeenCalled()
  }
)

it.each(transferCases)(
  'allows $mode into My contacts',
  async ({ mode, label }) => {
    jest.clearAllMocks()
    jest.mocked(copyContact).mockResolvedValue('new-card-id')
    jest.mocked(moveContact).mockResolvedValue()
    const { store, onClose } = renderDialog(mode)
    selectDestination('My contacts')
    fireEvent.click(screen.getByRole('button', { name: label }))
    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(mode === 'copy' ? copyContact : moveContact).toHaveBeenCalledWith(
      { userId: 'owner-source', addressBookId: 'source' },
      { userId: 'owner-contacts', addressBookId: 'contacts' },
      'c1'
    )
    expect(store.getState().contacts.addressBooks.contacts.contacts).toEqual([
      { ...contact, id: mode === 'copy' ? 'new-card-id' : contact.id }
    ])
    expect(store.getState().contacts.addressBooks.source.contacts).toEqual(
      mode === 'copy' ? [contact] : []
    )
  }
)

it.each(['copy', 'move'] as const)(
  'lists own books, then a Shared caption and the shared books for %s',
  mode => {
    renderDialog(mode)
    fireEvent.mouseDown(screen.getByRole('combobox'))
    const listbox = within(screen.getByRole('listbox'))
    expect(
      listbox.getAllByRole('option').map(option => option.textContent)
    ).toEqual(['My contacts', 'target', 'Alpha SharedBob Owner'])
    const caption = listbox.getByText('Shared')
    expect(caption).toHaveAttribute('role', 'presentation')
    expect(
      caption.compareDocumentPosition(
        listbox.getByRole('option', { name: 'target' })
      ) & Node.DOCUMENT_POSITION_PRECEDING
    ).toBeTruthy()
    expect(
      caption.compareDocumentPosition(
        listbox.getByRole('option', { name: /Alpha Shared/ })
      ) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy()
  }
)
