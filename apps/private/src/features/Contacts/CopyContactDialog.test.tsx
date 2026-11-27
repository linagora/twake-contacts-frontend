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
import {
  copyContact,
  deleteContact,
  fetchAddressBookDetails,
  fetchContactForMerge,
  fetchContactsPage,
  moveContact,
  saveContact
} from '@common/features/Contacts/ContactsDao'
import {
  copyContact as copyContactAction,
  moveContact as moveContactAction
} from '@common/features/Contacts/ContactsSlice'
import {
  AddressBookWithContacts,
  Contact
} from '@common/features/Contacts/contactsTypes'
import {
  duplicateContactUrn,
  duplicateDismissalProperty
} from '@common/features/Contacts/duplicateDismissals'
import { UserState } from '@common/features/User/UserSlice'
import { userData } from '@common/features/User/userDataTypes'
import en from '@common/locales/en.json'
import { ContactTransferSnackbar } from './ContactTransferSnackbar'
import { ContactTransferDialog } from './CopyContactDialog'

vi.mock('@common/features/Contacts/ContactsDao')

beforeEach(() => {
  vi.mocked(fetchContactsPage).mockResolvedValue({ entries: [], next: null })
  vi.mocked(fetchAddressBookDetails)
    .mockReset()
    .mockResolvedValue({
      members: [
        { openpaasId: 'owner-source' } as userData,
        { openpaasId: 'owner-target' } as userData
      ],
      isPublic: false
    })
})

const contact: Contact = { id: 'c1', displayName: 'Alice', emails: [] }
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
  sourceContact: Contact = contact,
  sourceBookId = 'source',
  extraBooks: Record<string, AddressBookWithContacts> = {}
): {
  store: ReturnType<typeof setupStore>
  onClose: Mock
  rerenderContact: (nextContact: Contact) => void
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
          sourceBookId: 'original-shared',
          ownerDisplayName: 'Bob Owner'
        },
        ...extraBooks
      }),
      listings: {},
      sort: DEFAULT_CONTACT_SORT,
      loading: false,
      error: null
    }
  })
  const onClose = vi.fn()
  const DialogHarness = ({
    currentContact
  }: {
    currentContact: Contact
  }): React.ReactElement => {
    const [open, setOpen] = useState(true)
    return (
      <>
        {open && (
          <ContactTransferDialog
            mode={mode}
            contact={currentContact}
            addressBookId={sourceBookId}
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
  const dialog = (currentContact: Contact): React.ReactElement => (
    <Provider store={store}>
      <TwakeMuiThemeProvider>
        <I18n dictRequire={() => en} lang="en">
          <MemoryRouter initialEntries={['/contacts']}>
            <Routes>
              <Route
                path="*"
                element={<DialogHarness currentContact={currentContact} />}
              />
            </Routes>
            <LocationDisplay />
          </MemoryRouter>
        </I18n>
      </TwakeMuiThemeProvider>
    </Provider>
  )
  const { rerender } = render(dialog(sourceContact))
  return {
    store,
    onClose,
    rerenderContact: nextContact => rerender(dialog(nextContact))
  }
}
const selectDestination = (name: string | RegExp = 'target'): void => {
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

it('shows no warning before selecting a destination or when selecting a private destination', () => {
  renderDialog('copy')

  expect(screen.queryByRole('alert')).not.toBeInTheDocument()

  selectDestination('target')

  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
})

it.each(['copy', 'move'] as const)(
  'warns when %s from a private address book to a shared address book',
  mode => {
    renderDialog(mode)

    fireEvent.mouseDown(screen.getByRole('combobox'))
    fireEvent.click(screen.getByRole('option', { name: /Alpha Shared/ }))

    expect(screen.getByRole('alert')).toHaveTextContent(
      'This private contact will be visible to everyone in Alpha Shared.'
    )
  }
)

it.each(['copy', 'move'] as const)(
  'warns when %s from a shared address book to another shared address book',
  mode => {
    renderDialog(mode, true, contact, 'shared', {
      otherShared: {
        ...book('otherShared'),
        name: 'Beta Shared',
        ownerId: 'u3',
        ownerDisplayName: 'Carol Owner'
      }
    })

    fireEvent.mouseDown(screen.getByRole('combobox'))
    fireEvent.click(screen.getByRole('option', { name: /Beta Shared/ }))

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Visible to everyone in Beta Shared.'
    )
  }
)

describe('duplicate detection during copy and move', () => {
  const sourceContact: Contact = {
    id: 'c1',
    displayName: 'Alice',
    emails: [{ value: 'alice@example.com', type: null }],
    phones: [{ value: '+123456789', type: null }]
  }
  const destDuplicate: Contact = {
    id: 'd1',
    displayName: 'Alice',
    emails: [{ value: 'alice@example.com', type: null }]
  }

  const setupDuplicateInTarget = (): void => {
    vi.mocked(fetchContactsPage).mockResolvedValue({
      entries: [{ addressBookId: 'target', contact: destDuplicate }],
      next: null
    })
    let savedTarget = { contact: destDuplicate, etag: 'etag-dst' }
    vi.mocked(fetchContactForMerge).mockImplementation((book, id) => {
      if (book.id === 'source' && id === 'c1') {
        return Promise.resolve({ contact: sourceContact, etag: 'etag-src' })
      }
      if (book.id === 'target' && id === 'd1') {
        return Promise.resolve(savedTarget)
      }
      return Promise.reject(new Error('Unexpected contact'))
    })
    vi.mocked(saveContact).mockImplementation((_user, _book, contact) => {
      const saved = { ...contact, etag: 'etag-dst-2' }
      savedTarget = { contact: saved, etag: saved.etag }
      return Promise.resolve(saved)
    })
    vi.mocked(deleteContact).mockResolvedValue()
    vi.mocked(copyContact).mockResolvedValue('new-card-id')
    vi.mocked(moveContact).mockResolvedValue()
  }

  it.each([
    {
      mode: 'copy' as const,
      confirmLabel: en.contacts.copy,
      alertText: en.contacts.transfer.duplicateCopyAlert.replace(
        '%{book}',
        'target'
      ),
      withoutMergeLabel: en.contacts.transfer.copyWithoutMerge
    },
    {
      mode: 'move' as const,
      confirmLabel: en.contacts.moveContact.confirm,
      alertText: en.contacts.transfer.duplicateMoveAlert.replace(
        '%{book}',
        'target'
      ),
      withoutMergeLabel: en.contacts.transfer.moveWithoutMerge
    }
  ])(
    'shows duplicate modal with alert and duplicate card when %s finds a duplicate',
    async ({ mode, confirmLabel, alertText, withoutMergeLabel }) => {
      vi.clearAllMocks()
      setupDuplicateInTarget()
      const { onClose } = renderDialog(mode, true, sourceContact)

      selectDestination('target')
      fireEvent.click(screen.getByRole('button', { name: confirmLabel }))

      await waitFor(() =>
        expect(
          screen.getByText(en.contacts.transfer.duplicateTitle)
        ).toBeInTheDocument()
      )
      expect(onClose).not.toHaveBeenCalled()
      expect(screen.getByRole('alert')).toHaveTextContent(alertText)
      expect(screen.getByText('+123456789')).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: withoutMergeLabel })
      ).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: en.contacts.merge.merge })
      ).toBeInTheDocument()
    }
  )

  it.each([
    {
      mode: 'copy' as const,
      confirmLabel: en.contacts.copy,
      withoutMergeLabel: en.contacts.transfer.copyWithoutMerge,
      dao: copyContact
    },
    {
      mode: 'move' as const,
      confirmLabel: en.contacts.moveContact.confirm,
      withoutMergeLabel: en.contacts.transfer.moveWithoutMerge,
      dao: moveContact
    }
  ])(
    '$mode without merging when user chooses not to merge',
    async ({ mode, confirmLabel, withoutMergeLabel, dao }) => {
      vi.clearAllMocks()
      setupDuplicateInTarget()
      const { onClose } = renderDialog(mode, true, sourceContact)

      selectDestination('target')
      fireEvent.click(screen.getByRole('button', { name: confirmLabel }))

      await waitFor(() =>
        expect(
          screen.getByRole('button', { name: withoutMergeLabel })
        ).toBeInTheDocument()
      )

      fireEvent.click(screen.getByRole('button', { name: withoutMergeLabel }))

      await waitFor(() => expect(onClose).toHaveBeenCalled())
      expect(dao).toHaveBeenCalledTimes(1)
      expect(saveContact).not.toHaveBeenCalled()
      expect(deleteContact).not.toHaveBeenCalled()
    }
  )

  it('merges copied contact into destination duplicate without deleting source', async () => {
    vi.clearAllMocks()
    setupDuplicateInTarget()
    const { store, onClose } = renderDialog('copy', true, sourceContact)

    selectDestination('target')
    fireEvent.click(screen.getByRole('button', { name: en.contacts.copy }))

    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: en.contacts.merge.merge })
      ).toBeInTheDocument()
    )

    fireEvent.click(
      screen.getByRole('button', { name: en.contacts.merge.merge })
    )

    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(saveContact).toHaveBeenCalledWith(
      'owner-target',
      'target',
      expect.objectContaining({
        id: 'd1',
        phones: [{ value: '+123456789', type: null }],
        etag: 'etag-dst'
      }),
      'update'
    )
    expect(deleteContact).not.toHaveBeenCalled()
    expect(copyContact).not.toHaveBeenCalled()
    expect(store.getState().contacts.transferSuccess).toEqual(
      expect.objectContaining({
        operation: 'copy',
        contactId: 'd1',
        destinationId: 'target'
      })
    )
  })

  it('merges moved contact into destination duplicate and deletes source contact', async () => {
    vi.clearAllMocks()
    setupDuplicateInTarget()
    const { store, onClose } = renderDialog('move', true, sourceContact)

    selectDestination('target')
    fireEvent.click(
      screen.getByRole('button', { name: en.contacts.moveContact.confirm })
    )

    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: en.contacts.merge.merge })
      ).toBeInTheDocument()
    )

    fireEvent.click(
      screen.getByRole('button', { name: en.contacts.merge.merge })
    )

    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(saveContact).toHaveBeenCalledWith(
      'owner-target',
      'target',
      expect.objectContaining({
        id: 'd1',
        phones: [{ value: '+123456789', type: null }],
        etag: 'etag-dst'
      }),
      'update'
    )
    expect(deleteContact).toHaveBeenCalledWith(
      'owner-source',
      'source',
      'c1',
      'etag-src'
    )
    expect(moveContact).not.toHaveBeenCalled()
    expect(store.getState().contacts.transferSuccess).toEqual(
      expect.objectContaining({
        operation: 'move',
        contactId: 'd1',
        destinationId: 'target'
      })
    )
  })

  it.each(transferCases)(
    'shows audience warning and Copy/Move anyway (without merging) when the delegated destination has a wider audience for $mode',
    async ({ mode, dao, label }) => {
      setupDuplicateInTarget()
      vi.mocked(fetchContactsPage).mockResolvedValue({
        entries: [{ addressBookId: 'shared', contact: destDuplicate }],
        next: null
      })
      vi.mocked(fetchAddressBookDetails).mockImplementation((_owner, bookId) =>
        Promise.resolve({
          members: [],
          isPublic: bookId === 'original-shared'
        })
      )
      const { onClose } = renderDialog(mode, true, sourceContact)
      selectDestination(/Alpha Shared/)
      fireEvent.click(screen.getByRole('button', { name: label }))

      const expectedAlert = en.contacts.transfer.audienceError.replace(
        '%{fields}',
        en.contacts.transfer.matchFields.name
      )
      await screen.findByText(expectedAlert)
      expect(screen.getByRole('alert')).toHaveTextContent(expectedAlert)
      expect(
        screen.queryByRole('button', { name: en.contacts.merge.merge })
      ).not.toBeInTheDocument()
      expect(
        screen.queryByRole('button', {
          name:
            mode === 'copy'
              ? en.contacts.transfer.copyWithoutMerge
              : en.contacts.transfer.moveWithoutMerge
        })
      ).not.toBeInTheDocument()
      const transferAnyway = screen.getByRole('button', {
        name:
          mode === 'copy'
            ? en.contacts.transfer.copyAnyway
            : en.contacts.transfer.moveAnyway
      })
      expect(fetchAddressBookDetails).toHaveBeenCalledWith(
        'owner-source',
        'source'
      )
      expect(fetchAddressBookDetails).toHaveBeenCalledWith(
        'u2',
        'original-shared'
      )
      expect(saveContact).not.toHaveBeenCalled()
      expect(deleteContact).not.toHaveBeenCalled()
      expect(dao).not.toHaveBeenCalled()
      expect(onClose).not.toHaveBeenCalled()

      fireEvent.click(transferAnyway)
      await waitFor(() => expect(onClose).toHaveBeenCalled())
      expect(dao).toHaveBeenCalledTimes(1)
      expect(saveContact).not.toHaveBeenCalled()
      expect(deleteContact).not.toHaveBeenCalled()
    }
  )

  it('keeps the move source when the saved destination is missing a merged phone', async () => {
    setupDuplicateInTarget()
    vi.mocked(fetchContactForMerge)
      .mockResolvedValueOnce({ contact: sourceContact, etag: 'etag-src' })
      .mockResolvedValueOnce({ contact: destDuplicate, etag: 'etag-dst' })
      .mockResolvedValueOnce({ contact: destDuplicate, etag: 'etag-dst-3' })
    const { onClose, store } = renderDialog('move', true, sourceContact)
    selectDestination()
    fireEvent.click(
      screen.getByRole('button', { name: en.contacts.moveContact.confirm })
    )

    fireEvent.click(
      await screen.findByRole('button', { name: en.contacts.merge.merge })
    )

    await screen.findByText(en.contacts.merge.changedError)
    expect(saveContact).toHaveBeenCalledWith(
      'owner-target',
      'target',
      expect.objectContaining({ phones: sourceContact.phones }),
      'update'
    )
    expect(deleteContact).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
    expect(store.getState().contacts.addressBooks.source.contacts).toEqual([
      sourceContact
    ])
  })

  it('shows conflict error in modal when merge fails due to conflicting fields', async () => {
    vi.clearAllMocks()
    const conflictingSource: Contact = {
      ...sourceContact,
      org: { name: 'Acme', units: [] }
    }
    const conflictingDest: Contact = {
      ...destDuplicate,
      org: { name: 'Beta', units: [] }
    }
    vi.mocked(fetchContactsPage).mockResolvedValue({
      entries: [{ addressBookId: 'target', contact: conflictingDest }],
      next: null
    })
    vi.mocked(fetchContactForMerge).mockImplementation((book, id) => {
      if (book.id === 'source' && id === 'c1') {
        return Promise.resolve({ contact: conflictingSource, etag: 'etag-src' })
      }
      if (book.id === 'target' && id === 'd1') {
        return Promise.resolve({ contact: conflictingDest, etag: 'etag-dst' })
      }
      return Promise.reject(new Error('Unexpected contact'))
    })

    const { onClose } = renderDialog('copy', true, conflictingSource)
    selectDestination('target')
    fireEvent.click(screen.getByRole('button', { name: en.contacts.copy }))

    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: en.contacts.merge.merge })
      ).toBeInTheDocument()
    )

    fireEvent.click(
      screen.getByRole('button', { name: en.contacts.merge.merge })
    )

    await waitFor(() =>
      expect(
        screen.getByText(
          en.contacts.merge.conflictErrorWithFields.replace(
            '%{fields}',
            en.contacts.merge.fields.org
          )
        )
      ).toBeInTheDocument()
    )
    expect(onClose).not.toHaveBeenCalled()
    expect(saveContact).not.toHaveBeenCalled()
  })

  it.each(transferCases)(
    'shows the merge error in the $mode dialog when the duplicate disappears',
    async ({ mode, label, messages }) => {
      setupDuplicateInTarget()
      const { onClose } = renderDialog(mode, true, sourceContact)
      selectDestination()
      fireEvent.click(screen.getByRole('button', { name: label }))
      const merge = await screen.findByRole('button', {
        name: en.contacts.merge.merge
      })
      vi.mocked(fetchContactForMerge)
        .mockResolvedValueOnce({ contact: sourceContact, etag: 'etag-src' })
        .mockRejectedValueOnce({ response: { status: 404 } })

      fireEvent.click(merge)

      const dialog = await screen.findByRole('dialog', { name: messages.title })
      expect(dialog).toHaveTextContent(en.contacts.merge.changedError)
      expect(screen.getByRole('combobox')).toHaveTextContent('target')
      expect(onClose).not.toHaveBeenCalled()
      expect(saveContact).not.toHaveBeenCalled()
      expect(deleteContact).not.toHaveBeenCalled()
    }
  )

  it.each(['source', 'target'] as const)(
    'rejects a dismissal newly saved on the %s contact and refreshes duplicate eligibility',
    async dismissedBook => {
      setupDuplicateInTarget()
      const { onClose } = renderDialog('move', true, sourceContact)
      selectDestination()
      const moveLabel = en.contacts.moveContact.confirm
      fireEvent.click(screen.getByRole('button', { name: moveLabel }))
      const merge = await screen.findByRole('button', {
        name: en.contacts.merge.merge
      })
      const source = { addressBookId: 'source', contact: sourceContact }
      const target = { addressBookId: 'target', contact: destDuplicate }
      const withDismissal = (
        entry: typeof source,
        peer: typeof source
      ): Contact => ({
        ...entry.contact,
        passthroughProps: [
          duplicateDismissalProperty(duplicateContactUrn(peer))
        ]
      })
      const freshSource =
        dismissedBook === 'source'
          ? withDismissal(source, target)
          : sourceContact
      const freshTarget =
        dismissedBook === 'target'
          ? withDismissal(target, source)
          : destDuplicate
      vi.mocked(fetchContactForMerge)
        .mockResolvedValueOnce({ contact: freshSource, etag: 'fresh-source' })
        .mockResolvedValueOnce({ contact: freshTarget, etag: 'fresh-target' })
      vi.mocked(fetchContactsPage).mockResolvedValue({
        entries: [{ ...target, contact: freshTarget }],
        next: null
      })

      fireEvent.click(merge)

      await screen.findByText(en.contacts.merge.changedError)
      expect(screen.getByRole('alert')).toHaveTextContent(
        en.contacts.merge.changedError
      )
      expect(
        screen.queryByRole('button', { name: en.contacts.merge.merge })
      ).not.toBeInTheDocument()
      expect(onClose).not.toHaveBeenCalled()
      expect(saveContact).not.toHaveBeenCalled()
      expect(deleteContact).not.toHaveBeenCalled()
      expect(moveContact).not.toHaveBeenCalled()

      fireEvent.click(screen.getByRole('button', { name: moveLabel }))
      await waitFor(() => expect(onClose).toHaveBeenCalled())
      expect(moveContact).toHaveBeenCalledTimes(1)
      expect(saveContact).not.toHaveBeenCalled()
      expect(deleteContact).not.toHaveBeenCalled()
    }
  )

  it('rescans with a newer contact prop after a source-only dismissal', async () => {
    setupDuplicateInTarget()
    const { onClose, rerenderContact } = renderDialog(
      'move',
      true,
      sourceContact
    )
    selectDestination()
    const move = (): HTMLElement =>
      screen.getByRole('button', { name: en.contacts.moveContact.confirm })
    fireEvent.click(move())
    const merge = await screen.findByRole('button', {
      name: en.contacts.merge.merge
    })
    vi.mocked(fetchContactForMerge).mockResolvedValueOnce({
      etag: 'dismissed',
      contact: {
        ...sourceContact,
        passthroughProps: [
          duplicateDismissalProperty(
            duplicateContactUrn({
              addressBookId: 'target',
              contact: destDuplicate
            })
          )
        ]
      }
    })
    fireEvent.click(merge)
    await screen.findByText(en.contacts.merge.changedError)

    rerenderContact({ ...sourceContact, etag: 'dismissal-removed' })
    fireEvent.click(move())

    await screen.findByRole('button', { name: en.contacts.merge.merge })
    expect(moveContact).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('keeps the move source until destination cleanup succeeds on retry', async () => {
    setupDuplicateInTarget()
    const extraDuplicate = { ...destDuplicate, id: 'd2' }
    vi.mocked(fetchContactsPage).mockResolvedValue({
      entries: [destDuplicate, extraDuplicate].map(contact => ({
        addressBookId: 'target',
        contact
      })),
      next: null
    })
    let savedTarget = { contact: destDuplicate, etag: 'etag-dst' }
    vi.mocked(fetchContactForMerge).mockImplementation((book, id) => {
      if (book.id === 'source' && id === 'c1') {
        return Promise.resolve({ contact: sourceContact, etag: 'etag-src' })
      }
      if (book.id === 'target' && id === 'd1') {
        return Promise.resolve(savedTarget)
      }
      if (book.id === 'target' && id === 'd2') {
        return Promise.resolve({ contact: extraDuplicate, etag: 'etag-extra' })
      }
      return Promise.reject(new Error('Unexpected contact'))
    })
    vi.mocked(saveContact).mockImplementation((_user, _book, contact) => {
      const saved = { ...contact, etag: 'etag-dst-2' }
      savedTarget = { contact: saved, etag: saved.etag }
      return Promise.resolve(saved)
    })
    vi.mocked(deleteContact).mockRejectedValueOnce(new Error('Delete failed'))
    const { onClose, store } = renderDialog('move', true, sourceContact)
    selectDestination()
    fireEvent.click(
      screen.getByRole('button', { name: en.contacts.moveContact.confirm })
    )
    const merge = await screen.findByRole('button', {
      name: en.contacts.merge.merge
    })

    fireEvent.click(merge)

    expect(
      await screen.findByText(en.contacts.merge.mergeError)
    ).toBeInTheDocument()
    expect(vi.mocked(deleteContact).mock.calls).toEqual([
      ['owner-target', 'target', 'd2', 'etag-extra']
    ])
    expect(store.getState().contacts.addressBooks.source.contacts).toEqual([
      sourceContact
    ])

    fireEvent.click(merge)
    expect(
      await screen.findByText(en.contacts.merge.changedError)
    ).toBeInTheDocument()
    fireEvent.click(
      screen.getByRole('button', { name: en.contacts.merge.merge })
    )

    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(vi.mocked(deleteContact).mock.calls).toEqual([
      ['owner-target', 'target', 'd2', 'etag-extra'],
      ['owner-target', 'target', 'd2', 'etag-extra'],
      ['owner-source', 'source', 'c1', 'etag-src']
    ])
    expect(store.getState().contacts.addressBooks.source.contacts).toEqual([])
  })

  it.each([
    {
      mode: 'copy' as const,
      confirmLabel: en.contacts.copy,
      title: en.contacts.copyContact.title
    },
    {
      mode: 'move' as const,
      confirmLabel: en.contacts.moveContact.confirm,
      title: en.contacts.moveContact.title
    }
  ])(
    'returns to the %s modal when clicking cancel in the duplicate modal',
    async ({ mode, confirmLabel, title }) => {
      vi.clearAllMocks()
      setupDuplicateInTarget()
      const { onClose } = renderDialog(mode, true, sourceContact)

      selectDestination('target')
      fireEvent.click(screen.getByRole('button', { name: confirmLabel }))

      await waitFor(() =>
        expect(
          screen.getByText(en.contacts.transfer.duplicateTitle)
        ).toBeInTheDocument()
      )

      fireEvent.click(
        screen.getByRole('button', { name: en.contacts.form.cancel })
      )

      expect(onClose).not.toHaveBeenCalled()
      expect(screen.getByText(title)).toBeInTheDocument()
      expect(
        screen.queryByText(en.contacts.transfer.duplicateTitle)
      ).not.toBeInTheDocument()
    }
  )
})
