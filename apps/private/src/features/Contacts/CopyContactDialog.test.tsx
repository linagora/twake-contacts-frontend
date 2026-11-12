import {
  classifyAddressBook,
  classifyAddressBooks
} from '@common/features/Contacts/addressBookModel'
import { DEFAULT_CONTACT_SORT } from '@common/features/Contacts/constants'
import type { Mock } from 'vitest'
import { useState } from 'react'
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within
} from '@testing-library/react'
import { Provider } from 'react-redux'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
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

vi.mock('@common/features/Contacts/ContactsDao')

const contact = { id: 'c1', displayName: 'Alice', emails: [] }
const book = (id: string, canWrite = true): AddressBookWithContacts =>
  classifyAddressBook(
    {
      id,
      userId: `owner-${id}`,
      name: id,
      canWrite,
      acl: [],
      contactsCount: 0,
      contacts: []
    },
    `owner-${id}`
  )
const LocationDisplay = (): React.ReactElement => (
  <div data-testid="location">{useLocation().pathname}</div>
)
const renderDialog = (
  mode: 'copy' | 'move' = 'copy',
  sourceCanWrite = true,
  sourceContact = contact
): {
  store: ReturnType<typeof setupStore>
  onClose: Mock
} => {
  const store = setupStore({
    user: { userData: { openpaasId: 'u1' } } as UserState,
    contacts: {
      addressBooks: classifyAddressBooks({
        source: {
          ...book('source', sourceCanWrite),
          contacts: [sourceContact],
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
      }),
      listings: {},
      sort: DEFAULT_CONTACT_SORT,
      loading: false,
      error: null
    }
  })
  const onClose = vi.fn()
  const DialogHarness = (): React.ReactElement => {
    const [open, setOpen] = useState(true)
    return (
      <>
        {open && (
          <ContactTransferDialog
            mode={mode}
            contact={sourceContact}
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
          <MemoryRouter initialEntries={['/contacts']}>
            <Routes>
              <Route path="*" element={<DialogHarness />} />
            </Routes>
            <LocationDisplay />
          </MemoryRouter>
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
    vi.clearAllMocks()
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
    vi.clearAllMocks()
    vi.mocked(copyContact).mockResolvedValue('new-card-id')
    vi.mocked(moveContact).mockResolvedValue()
    const { store, onClose } = renderDialog(mode)
    expect(screen.getByRole('button', { name: label })).toBeDisabled()
    selectDestination()
    fireEvent.click(screen.getByRole('button', { name: label }))
    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(screen.getByRole('alert')).toHaveTextContent(
      messages.success.replace('%{name}', 'Alice').replace('%{book}', 'target')
    )
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
    vi.clearAllMocks()
    vi.mocked(dao).mockRejectedValue(new Error('Transfer failed'))
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

it('reports a failed move with the translated message, never the raw HTTP text', async () => {
  vi.clearAllMocks()
  const rawMessage = 'Request failed with status code 500 Internal Server Error'
  vi.mocked(moveContact).mockRejectedValue(
    Object.assign(new Error(rawMessage), {
      name: 'HTTPError',
      response: { status: 500 }
    })
  )
  const { store } = renderDialog('move')
  selectDestination()
  fireEvent.click(screen.getByRole('button', { name: 'Move' }))

  expect(await screen.findByRole('alert')).toHaveTextContent(
    en.contacts.moveContact.error
  )
  expect(store.getState().contacts.error).toBe('contacts.moveContact.error')
  expect(screen.queryByText(rawMessage)).not.toBeInTheDocument()
})

it('reports a forbidden move with the permission message', async () => {
  vi.clearAllMocks()
  vi.mocked(moveContact).mockRejectedValue(
    Object.assign(new Error('Forbidden'), {
      name: 'HTTPError',
      response: { status: 403 }
    })
  )
  const { store } = renderDialog('move')
  selectDestination()
  fireEvent.click(screen.getByRole('button', { name: 'Move' }))

  await waitFor(() =>
    expect(store.getState().contacts.error).toBe('contacts.errors.forbidden')
  )
})

it.each(transferCases)(
  'allows $mode into My contacts',
  async ({ mode, label }) => {
    vi.clearAllMocks()
    vi.mocked(copyContact).mockResolvedValue('new-card-id')
    vi.mocked(moveContact).mockResolvedValue()
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

it.each(['copy', 'move'] as const)(
  'names the contact and its current book in the %s dialog',
  mode => {
    renderDialog(mode)
    expect(screen.getByText('Alice · currently in source')).toBeInTheDocument()
  }
)

it.each(transferCases)(
  'opens the $mode result from the toast and closes it',
  async ({ mode, label }) => {
    vi.clearAllMocks()
    vi.mocked(copyContact).mockResolvedValue('new-card-id')
    vi.mocked(moveContact).mockResolvedValue()
    const { store, onClose } = renderDialog(mode)
    selectDestination('My contacts')
    fireEvent.click(screen.getByRole('button', { name: label }))
    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(screen.getByRole('alert')).toHaveTextContent(
      `“Alice” ${mode === 'copy' ? 'copied' : 'moved'} to My contacts`
    )
    fireEvent.click(screen.getByRole('button', { name: 'Open' }))
    expect(screen.getByTestId('location')).toHaveTextContent(
      `/contacts/contacts/${mode === 'copy' ? 'new-card-id' : 'c1'}`
    )
    expect(store.getState().contacts.transferSuccess).toBeNull()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  }
)

it.each([
  { id: 'a/b', path: '/contacts/contacts/a%2Fb' },
  { id: 'c#1', path: '/contacts/contacts/c%231' },
  { id: '100%', path: '/contacts/contacts/100%25' }
])(
  'opens a moved card whose file name is "$id" from the toast',
  async ({ id, path }) => {
    vi.clearAllMocks()
    vi.mocked(moveContact).mockResolvedValue()
    const { onClose } = renderDialog('move', true, { ...contact, id })
    selectDestination('My contacts')
    fireEvent.click(screen.getByRole('button', { name: 'Move' }))
    await waitFor(() => expect(onClose).toHaveBeenCalled())
    fireEvent.click(screen.getByRole('button', { name: 'Open' }))
    expect(screen.getByTestId('location')).toHaveTextContent(path)
  }
)
