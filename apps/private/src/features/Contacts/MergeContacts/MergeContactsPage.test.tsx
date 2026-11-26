import { setupStore } from '@common/app/store'
import { classifyAddressBooks } from '@common/features/Contacts/addressBookModel'
import {
  deleteContact,
  fetchAddressBookDetails,
  fetchContactsPage,
  fetchContactForMerge,
  saveContact
} from '@common/features/Contacts/ContactsDao'
import {
  DEFAULT_ADDRESS_BOOK_ID,
  DEFAULT_CONTACT_SORT
} from '@common/features/Contacts/constants'
import { Contact } from '@common/features/Contacts/contactsTypes'
import { JCalProperty } from '@common/features/Contacts/davTypes'
import { duplicateDismissalProperty } from '@common/features/Contacts/duplicateDismissals'
import {
  denormalizeContact,
  normalizeContact
} from '@common/features/Contacts/transformer/ContactsTransformer'
import { UserState } from '@common/features/User/UserSlice'
import { userData as UserData } from '@common/features/User/userDataTypes'
import en from '@common/locales/en.json'
import { TwakeMuiThemeProvider } from '@linagora/twake-mui'
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within
} from '@testing-library/react'
import { Provider } from 'react-redux'
import { MemoryRouter } from 'react-router'
import I18n from 'twake-i18n'
import { MergeContactsPage } from './MergeContactsPage'

vi.mock('@common/features/Contacts/ContactsDao', async () => ({
  ...(await vi.importActual<
    typeof import('@common/features/Contacts/ContactsDao')
  >('@common/features/Contacts/ContactsDao')),
  fetchAddressBookDetails: vi.fn(),
  fetchContactsPage: vi.fn(),
  fetchContactForMerge: vi.fn(),
  saveContact: vi.fn(),
  deleteContact: vi.fn()
}))

const mockFetchAddressBookDetails = vi.mocked(fetchAddressBookDetails)
const mockFetchContactsPage = vi.mocked(fetchContactsPage)
const mockFetchContactForMerge = vi.mocked(fetchContactForMerge)
const mockSaveContact = vi.mocked(saveContact)
const mockDeleteContact = vi.mocked(deleteContact)

function openMergeAllConfirmation(): HTMLElement {
  fireEvent.click(screen.getByRole('button', { name: 'Merge all' }))
  return screen.getByRole('dialog', { name: 'Merge all' })
}

function confirmMergeAll(): void {
  const confirmation = openMergeAllConfirmation()
  fireEvent.click(
    within(confirmation).getByRole('button', { name: 'Merge all' })
  )
}

function renderMergePage(): ReturnType<typeof render> {
  const store = setupStore({
    user: { userData: { openpaasId: 'u1' } } as UserState,
    contacts: {
      addressBooks: classifyAddressBooks(
        {
          [DEFAULT_ADDRESS_BOOK_ID]: {
            id: DEFAULT_ADDRESS_BOOK_ID,
            userId: 'u1',
            name: '',
            isDefault: true,
            contactsCount: 0,
            acl: [],
            canWrite: true,
            contacts: []
          },
          personal1: {
            id: 'personal1',
            userId: 'u1',
            name: 'Family',
            contactsCount: 0,
            acl: [],
            canWrite: true,
            contacts: []
          },
          dab: {
            id: 'dab',
            userId: 'domain',
            name: 'Domain',
            contactsCount: 0,
            acl: [],
            canWrite: false,
            contacts: []
          },
          shared1: {
            id: 'shared1',
            userId: 'u2',
            ownerId: 'u2',
            name: 'Shared Book',
            contactsCount: 0,
            acl: [],
            canWrite: true,
            contacts: []
          }
        },
        'u1'
      ),
      listings: {},
      sort: DEFAULT_CONTACT_SORT,
      loading: false,
      error: null
    }
  })

  return render(
    <Provider store={store}>
      <I18n dictRequire={() => en} lang="en">
        <TwakeMuiThemeProvider>
          <MemoryRouter initialEntries={['/contacts/merge']}>
            <MergeContactsPage />
          </MemoryRouter>
        </TwakeMuiThemeProvider>
      </I18n>
    </Provider>
  )
}

const readMockContactForMerge = async (
  book: { id: string },
  contactId: string
): ReturnType<typeof fetchContactForMerge> => {
  const pages = await Promise.all(
    mockFetchContactsPage.mock.results.map(
      result => result.value as ReturnType<typeof fetchContactsPage>
    )
  )
  const entry = pages
    .flatMap(page => page.entries)
    .find(
      item => item.addressBookId === book.id && item.contact.id === contactId
    )
  if (!entry) throw new Error('Missing test contact')
  return { contact: entry.contact, etag: `"${contactId}-v1"` }
}

const DEFAULT_MOCK_PAGES: Record<
  string,
  Awaited<ReturnType<typeof fetchContactsPage>>
> = {
  [`${DEFAULT_ADDRESS_BOOK_ID}:`]: {
    entries: [
      {
        addressBookId: DEFAULT_ADDRESS_BOOK_ID,
        contact: {
          id: 'c1',
          displayName: 'Isabella Martinez',
          emails: [{ type: null, value: 'mail@twake.app' }],
          phones: [{ type: 'cell', value: '+3365024491' }]
        }
      }
    ],
    next: 'cursor-1'
  },
  [`${DEFAULT_ADDRESS_BOOK_ID}:cursor-1`]: {
    entries: [
      {
        addressBookId: DEFAULT_ADDRESS_BOOK_ID,
        contact: {
          id: 'c2',
          displayName: 'Robert Rodrigez',
          emails: [{ type: null, value: 'robert@twake.app' }],
          phones: [{ type: 'cell', value: '+3365099999' }]
        }
      }
    ],
    next: null
  },
  'personal1:': {
    entries: [
      {
        addressBookId: 'personal1',
        contact: {
          id: 'c3',
          displayName: 'Isabella Work',
          emails: [],
          phones: [{ type: 'cell', value: '+3365024491' }]
        }
      },
      {
        addressBookId: 'personal1',
        contact: {
          id: 'c4',
          displayName: 'Rob',
          emails: [{ type: 'work', value: 'robert@twake.app' }],
          phones: []
        }
      }
    ],
    next: null
  }
}

describe('MergeContactsPage', () => {
  beforeEach(() => {
    mockSaveContact
      .mockReset()
      .mockImplementation((_userId, _bookId, contact) =>
        Promise.resolve(contact)
      )
    mockDeleteContact.mockReset().mockResolvedValue(undefined)
    mockFetchAddressBookDetails
      .mockReset()
      .mockResolvedValue({ members: [], isPublic: false })
    mockFetchContactForMerge
      .mockReset()
      .mockImplementation(readMockContactForMerge)
    mockFetchContactsPage
      .mockReset()
      .mockImplementation((_userId, book, { after }) =>
        Promise.resolve(
          DEFAULT_MOCK_PAGES[`${book?.id ?? ''}:${after ?? ''}`] ?? {
            entries: [],
            next: null
          }
        )
      )
  })

  it('fetches personal books via fetchContactsPage and renders duplicate groups', async () => {
    renderMergePage()

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'Merge duplicates (2)' })
      ).toBeInTheDocument()
    })

    const fetchedBookIds = mockFetchContactsPage.mock.calls.map(
      call => call[1]?.id
    )
    expect(fetchedBookIds).not.toContain('dab')
    expect(fetchedBookIds).not.toContain('shared1')
    expect(screen.getByText('Isabella Martinez')).toBeInTheDocument()
    expect(screen.getByText('Isabella Work')).toBeInTheDocument()
    expect(screen.getByText('Robert Rodrigez')).toBeInTheDocument()
    expect(screen.getByText('Rob')).toBeInTheDocument()
  })

  it('merges a single group, marks the card as merged without refetching', async () => {
    renderMergePage()

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'Merge duplicates (2)' })
      ).toBeInTheDocument()
    })

    const initialFetchCount = mockFetchContactsPage.mock.calls.length
    const mergeButtons = screen.getAllByRole('button', { name: 'Merge' })
    fireEvent.click(mergeButtons[0])

    await waitFor(() => {
      expect(screen.getByLabelText('Merged')).toBeInTheDocument()
    })
    const viewContactLink = screen.getByRole('link', { name: 'View contact' })
    expect(viewContactLink).toHaveAttribute(
      'href',
      `/contacts/${DEFAULT_ADDRESS_BOOK_ID}/c1`
    )
    expect(viewContactLink).toHaveAttribute('target', '_blank')
    expect(viewContactLink).toHaveAttribute('rel', 'noopener noreferrer')
    expect(screen.getByText('Isabella Martinez')).toBeInTheDocument()
    expect(screen.getByText('Contacts merged')).toBeInTheDocument()
    expect(mockSaveContact).toHaveBeenCalledTimes(1)
    expect(mockDeleteContact).toHaveBeenCalledTimes(1)
    expect(mockFetchContactsPage).toHaveBeenCalledTimes(initialFetchCount)

    fireEvent.click(viewContactLink)
    expect(screen.queryByText('Isabella Martinez')).not.toBeInTheDocument()
    expect(screen.getByText('Robert Rodrigez')).toBeInTheDocument()
  })

  it('shows loading state only on the selected group when merging a single group', async () => {
    let finishSave: (() => void) | undefined
    mockSaveContact.mockImplementation(
      (_userId, _bookId, contact) =>
        new Promise(resolve => {
          finishSave = () => resolve(contact)
        })
    )

    renderMergePage()

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'Merge duplicates (2)' })
      ).toBeInTheDocument()
    })

    const mergeButtons = screen.getAllByRole('button', { name: 'Merge' })
    expect(mergeButtons).toHaveLength(2)

    fireEvent.click(mergeButtons[0])

    await waitFor(() => {
      expect(mockSaveContact).toHaveBeenCalledTimes(1)
    })

    expect(mergeButtons[0]).toHaveClass('MuiButton-loading')
    expect(mergeButtons[0]).toBeDisabled()
    expect(mergeButtons[1]).not.toHaveClass('MuiButton-loading')
    expect(mergeButtons[1]).toBeEnabled()

    finishSave?.()

    await waitFor(() => {
      expect(screen.getByLabelText('Merged')).toBeInTheDocument()
    })
    expect(screen.getByLabelText('Merged')).toHaveClass('u-pos-absolute')
    expect(mergeButtons[1]).toBeEnabled()
  })

  it('merges all groups and marks all cards as merged', async () => {
    renderMergePage()

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'Merge duplicates (2)' })
      ).toBeInTheDocument()
    })

    confirmMergeAll()

    await waitFor(() => {
      expect(screen.getAllByLabelText('Merged')).toHaveLength(2)
    })
    expect(
      screen.getByText('All duplicate contacts merged')
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Merge all' })).toBeDisabled()
  })

  it('merges all into the book shared with no one, never into a shared one', async () => {
    const sharee = { openpaasId: 'mallory' } as UserData
    mockFetchAddressBookDetails.mockImplementation((_userId, bookId) =>
      Promise.resolve({
        members: bookId === DEFAULT_ADDRESS_BOOK_ID ? [sharee] : [],
        isPublic: false
      })
    )
    renderMergePage()
    await screen.findByText('Isabella Martinez')

    confirmMergeAll()

    await waitFor(() => {
      expect(screen.getAllByLabelText('Merged')).toHaveLength(2)
    })
    expect(mockSaveContact.mock.calls.map(([, bookId]) => bookId)).toEqual([
      'personal1',
      'personal1'
    ])
    expect(mockDeleteContact.mock.calls.map(([, bookId]) => bookId)).toEqual([
      DEFAULT_ADDRESS_BOOK_ID,
      DEFAULT_ADDRESS_BOOK_ID
    ])
  })

  it('does not merge copies of books shared with different users', async () => {
    mockFetchAddressBookDetails.mockImplementation((_userId, bookId) =>
      Promise.resolve({
        members: [{ openpaasId: `sharee-of-${bookId}` } as UserData],
        isPublic: false
      })
    )
    renderMergePage()
    await screen.findByText('Isabella Martinez')

    confirmMergeAll()

    expect(
      await screen.findAllByText(en.contacts.merge.audienceError)
    ).toHaveLength(2)
    expect(mockSaveContact).not.toHaveBeenCalled()
    expect(mockDeleteContact).not.toHaveBeenCalled()
  })

  it.each(['single', 'all'])(
    'shows a merge error for %s without success',
    async action => {
      mockSaveContact.mockRejectedValue(new Error('network error'))
      renderMergePage()
      await screen.findByText('Isabella Martinez')
      if (action === 'all') confirmMergeAll()
      else fireEvent.click(screen.getAllByRole('button', { name: 'Merge' })[0])
      const alerts = await screen.findAllByText(en.contacts.merge.mergeError)
      expect(alerts).toHaveLength(action === 'all' ? 2 : 1)
      expect(screen.queryByText('Contacts merged')).not.toBeInTheDocument()
      expect(
        screen.queryByText('All duplicate contacts merged')
      ).not.toBeInTheDocument()
      expect(mockDeleteContact).not.toHaveBeenCalled()
    }
  )

  it('warns about cross-book deletion and waits for confirmation before merging all', async () => {
    renderMergePage()
    await screen.findByText('Isabella Martinez')
    const confirmation = openMergeAllConfirmation()
    expect(confirmation).toHaveAccessibleDescription(
      en.contacts.merge.mergeAllDescription
    )
    expect(mockSaveContact).not.toHaveBeenCalled()
    expect(mockDeleteContact).not.toHaveBeenCalled()

    fireEvent.click(
      within(confirmation).getByRole('button', { name: 'Cancel' })
    )
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    )
    expect(mockSaveContact).not.toHaveBeenCalled()
    expect(mockDeleteContact).not.toHaveBeenCalled()
  })

  it('saves a dismissed pair in both vCards and excludes it from a fresh scan', async () => {
    const first = DEFAULT_MOCK_PAGES[`${DEFAULT_ADDRESS_BOOK_ID}:`].entries[0]
    const second = DEFAULT_MOCK_PAGES['personal1:'].entries[0]
    const stored = [first, second].map(entry => ({ ...entry }))
    mockFetchContactsPage.mockImplementation((_user, book) =>
      Promise.resolve({
        entries: stored.filter(entry => entry.addressBookId === book?.id),
        next: null
      })
    )
    mockSaveContact.mockImplementation((_user, bookId, contact) => {
      const entry = stored.find(item => item.addressBookId === bookId)
      if (!entry) throw new Error('Missing test contact')
      entry.contact = normalizeContact({
        _links: {
          self: { href: `/addressbooks/u1/${bookId}/${contact.id}.vcf` }
        },
        data: denormalizeContact(contact)
      })
      return Promise.resolve(entry.contact)
    })
    const page = renderMergePage()
    await screen.findByText('Isabella Martinez')
    expect(screen.getByText('My contacts')).toBeInTheDocument()
    expect(screen.getByText('Family')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }))
    await screen.findByText(en.contacts.merge.dismissSuccess)
    expect(screen.queryByText('Isabella Martinez')).not.toBeInTheDocument()
    expect(mockSaveContact).toHaveBeenCalledTimes(2)
    expect(mockSaveContact).toHaveBeenCalledWith(
      'u1',
      DEFAULT_ADDRESS_BOOK_ID,
      expect.objectContaining({
        etag: '"c1-v1"',
        passthroughProps: [
          duplicateDismissalProperty('urn:twake:contact:personal1:c3')
        ]
      }),
      'update'
    )
    expect(mockSaveContact).toHaveBeenCalledWith(
      'u1',
      'personal1',
      expect.objectContaining({
        etag: '"c3-v1"',
        passthroughProps: [
          duplicateDismissalProperty('urn:twake:contact:contacts:c1')
        ]
      }),
      'update'
    )
    expect(mockDeleteContact).not.toHaveBeenCalled()

    page.unmount()
    renderMergePage()
    await screen.findByText(en.contacts.merge.emptyTitle)
    expect(
      screen.queryByRole('button', { name: 'Dismiss' })
    ).not.toBeInTheDocument()
  })

  it('can retry a partial dismissal without rewriting an already marked card', async () => {
    const originalRead = mockFetchContactForMerge.getMockImplementation()
    const stored = new Map<string, Contact>()
    mockFetchContactForMerge.mockImplementation(async (book, id) => {
      if (!originalRead) throw new Error('Missing reader')
      const snapshot = await originalRead(book, id)
      return { ...snapshot, contact: stored.get(id) ?? snapshot.contact }
    })
    const save = (
      _user: string,
      _book: string,
      contact: Contact
    ): Promise<Contact> => {
      stored.set(contact.id, contact)
      return Promise.resolve(contact)
    }
    mockSaveContact
      .mockImplementation(save)
      .mockImplementationOnce(save)
      .mockRejectedValueOnce(new Error('network error'))

    renderMergePage()
    await screen.findByText('Isabella Martinez')
    fireEvent.click(screen.getAllByRole('button', { name: 'Dismiss' })[0])
    await screen.findByText(en.contacts.merge.dismissError)
    expect(screen.getByText('Isabella Martinez')).toBeInTheDocument()

    fireEvent.click(screen.getAllByRole('button', { name: 'Dismiss' })[0])
    await screen.findByText(en.contacts.merge.dismissSuccess)
    expect(
      mockSaveContact.mock.calls.map(([, , contact]) => contact.id)
    ).toEqual(['c1', 'c3', 'c3'])
    expect(mockDeleteContact).not.toHaveBeenCalled()
  })

  it('refuses to merge a pair dismissed after the scan', async () => {
    renderMergePage()
    await screen.findByText('Isabella Martinez')
    const originalRead = mockFetchContactForMerge.getMockImplementation()
    mockFetchContactForMerge.mockImplementation(async (book, id) => {
      if (!originalRead) throw new Error('Missing reader')
      const snapshot = await originalRead(book, id)
      return id === 'c1'
        ? {
            ...snapshot,
            contact: {
              ...snapshot.contact,
              passthroughProps: [
                duplicateDismissalProperty('urn:twake:contact:personal1:c3')
              ]
            }
          }
        : snapshot
    })
    fireEvent.click(screen.getAllByRole('button', { name: 'Merge' })[0])
    await screen.findByText(en.contacts.merge.changedError)
    expect(screen.queryByText('Isabella Martinez')).not.toBeInTheDocument()
    expect(mockSaveContact).not.toHaveBeenCalled()
    expect(mockDeleteContact).not.toHaveBeenCalled()
  })

  it('refreshes changed candidates and requires another merge action', async () => {
    renderMergePage()
    await screen.findByText('Isabella Martinez')
    const originalRead = mockFetchContactForMerge.getMockImplementation()
    mockFetchContactForMerge.mockImplementation(async (book, id) => {
      if (!originalRead) throw new Error('Missing reader')
      const snapshot = await originalRead(book, id)
      return id === 'c3'
        ? { ...snapshot, contact: { ...snapshot.contact, note: 'New note' } }
        : snapshot
    })
    fireEvent.click(screen.getAllByRole('button', { name: 'Merge' })[0])
    expect(
      await screen.findByText(en.contacts.merge.changedError)
    ).toBeInTheDocument()
    expect(mockSaveContact).not.toHaveBeenCalled()
    expect(mockDeleteContact).not.toHaveBeenCalled()
    fireEvent.click(screen.getAllByRole('button', { name: 'Merge' })[0])
    await screen.findByText('Contacts merged')
    expect(mockSaveContact).toHaveBeenCalledWith(
      'u1',
      DEFAULT_ADDRESS_BOOK_ID,
      expect.objectContaining({ note: 'New note', etag: '"c1-v1"' }),
      'update'
    )
    expect(mockDeleteContact).toHaveBeenCalledWith(
      'u1',
      'personal1',
      'c3',
      '"c3-v1"'
    )
  })

  it.each(['note', 'opaque'])(
    'blocks deletion when %s details conflict',
    async field => {
      const originalFetch = mockFetchContactsPage.getMockImplementation()
      mockFetchContactsPage.mockImplementation(async (...args) => {
        if (!originalFetch) throw new Error('Missing reader')
        const page = await originalFetch(...args)
        return {
          ...page,
          entries: page.entries.map(entry => ({
            ...entry,
            contact: {
              ...entry.contact,
              ...(field === 'note'
                ? { note: entry.contact.id }
                : {
                    passthroughProps: [
                      ['kind', {}, 'text', entry.contact.id] as JCalProperty
                    ]
                  })
            }
          }))
        }
      })
      renderMergePage()
      await screen.findByText('Isabella Martinez')
      fireEvent.click(screen.getAllByRole('button', { name: 'Merge' })[0])
      const expectedField = field === 'note' ? 'Note' : 'KIND'
      expect(
        await screen.findByText(
          en.contacts.merge.conflictErrorWithFields.replace(
            '%{fields}',
            expectedField
          )
        )
      ).toBeInTheDocument()
      expect(mockSaveContact).not.toHaveBeenCalled()
      expect(mockDeleteContact).not.toHaveBeenCalled()
    }
  )

  it('keeps bulk merging busy until the other worker finishes after a failure', async () => {
    let finishSave: (() => void) | undefined
    mockSaveContact
      .mockRejectedValueOnce(new Error('failed'))
      .mockImplementationOnce(
        (_userId, _bookId, contact) =>
          new Promise(resolve => {
            finishSave = () => resolve(contact)
          })
      )
    renderMergePage()
    await screen.findByText('Isabella Martinez')
    confirmMergeAll()
    await waitFor(() => expect(mockSaveContact).toHaveBeenCalledTimes(2))
    expect(screen.getByRole('button', { name: 'Merge all' })).toBeDisabled()
    expect(
      screen.queryByText(en.contacts.merge.mergeError)
    ).not.toBeInTheDocument()
    finishSave?.()
    expect(
      await screen.findByText(en.contacts.merge.mergeError)
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Merge all' })).toBeEnabled()
  })

  it.each([404, 403])(
    'continues deleting only on 404 (status %s)',
    async status => {
      const contacts = Array.from({ length: 4 }, (_, index) => ({
        addressBookId: DEFAULT_ADDRESS_BOOK_ID,
        contact: {
          id: `four-${index}`,
          displayName: 'Four candidates',
          emails: [{ type: null, value: `four${index}@example.org` }]
        }
      }))
      mockFetchContactsPage.mockImplementation((_userId, book) =>
        Promise.resolve({
          entries: book?.id === DEFAULT_ADDRESS_BOOK_ID ? contacts : [],
          next: null
        })
      )
      mockDeleteContact.mockRejectedValueOnce({ response: { status } })
      renderMergePage()
      await screen.findByRole('heading', { name: 'Merge duplicates (1)' })
      expect(screen.getAllByRole('listitem')).toHaveLength(4)
      fireEvent.click(screen.getByRole('button', { name: 'Merge' }))
      if (status === 404) {
        await screen.findByText('Contacts merged')
        expect(mockDeleteContact).toHaveBeenCalledTimes(3)
      } else {
        await screen.findByText(en.contacts.merge.mergeError)
        expect(mockDeleteContact).toHaveBeenCalledTimes(1)
      }
    }
  )

  it('stops before deletion when a conditional save detects a concurrent edit', async () => {
    mockSaveContact.mockRejectedValue({ response: { status: 412 } })
    renderMergePage()
    await screen.findByText('Isabella Martinez')
    fireEvent.click(screen.getAllByRole('button', { name: 'Merge' })[0])
    await screen.findByText(en.contacts.merge.mergeError)
    expect(mockDeleteContact).not.toHaveBeenCalled()
    expect(screen.queryByText('Contacts merged')).not.toBeInTheDocument()
  })

  it.each([404, 403, 500, 'missing strong ETag'])(
    'keeps sources when post-save target confirmation fails (%s)',
    async failure => {
      const originalRead = mockFetchContactForMerge.getMockImplementation()
      let saved = false
      mockSaveContact.mockImplementation((_userId, _bookId, contact) => {
        saved = true
        return Promise.resolve({ ...contact, etag: undefined })
      })
      mockFetchContactForMerge.mockImplementation(async (book, id) => {
        if (saved) {
          if (typeof failure === 'string') throw new Error(failure)
          throw Object.assign(new Error('Read failed'), {
            response: { status: failure }
          })
        }
        if (!originalRead) throw new Error('Missing reader')
        return originalRead(book, id)
      })
      renderMergePage()
      await screen.findByText('Isabella Martinez')
      fireEvent.click(screen.getAllByRole('button', { name: 'Merge' })[0])
      await screen.findByText(
        failure === 404
          ? en.contacts.merge.changedError
          : en.contacts.merge.mergeError
      )
      expect(mockSaveContact).toHaveBeenCalledTimes(1)
      expect(mockDeleteContact).not.toHaveBeenCalled()
      expect(screen.getByText('Isabella Work')).toBeInTheDocument()
      expect(screen.queryByText('Contacts merged')).not.toBeInTheDocument()
    }
  )

  it('refreshes a partially merged group when a candidate has disappeared', async () => {
    renderMergePage()
    await screen.findByText('Isabella Martinez')
    const originalRead = mockFetchContactForMerge.getMockImplementation()
    mockFetchContactForMerge.mockImplementation(async (book, id) => {
      if (id === 'c3')
        throw Object.assign(new Error('Not found'), {
          response: { status: 404 }
        })
      if (!originalRead) throw new Error('Missing reader')
      return originalRead(book, id)
    })
    fireEvent.click(screen.getAllByRole('button', { name: 'Merge' })[0])
    await screen.findByText(en.contacts.merge.changedError)
    expect(screen.queryByText('Isabella Work')).not.toBeInTheDocument()
    expect(mockSaveContact).not.toHaveBeenCalled()
    expect(mockDeleteContact).not.toHaveBeenCalled()
  })

  it('shows an error alert when loading contacts fails', async () => {
    mockFetchContactsPage.mockRejectedValue(new Error('network error'))

    renderMergePage()

    await waitFor(() => {
      expect(
        screen.getByText('Failed to load contacts for deduplication.')
      ).toBeInTheDocument()
    })
    expect(
      screen.queryByText(en.contacts.merge.emptyTitle)
    ).not.toBeInTheDocument()
    expect(
      screen.queryByText(en.contacts.merge.emptySubtitle)
    ).not.toBeInTheDocument()
  })

  it('shows the empty state after a successful scan without duplicates', async () => {
    mockFetchContactsPage.mockResolvedValue({ entries: [], next: null })
    renderMergePage()
    expect(
      await screen.findByText(en.contacts.merge.emptyTitle)
    ).toBeInTheDocument()
    expect(
      screen.getByText(en.contacts.merge.emptySubtitle)
    ).toBeInTheDocument()
    expect(
      screen.queryByText(en.contacts.merge.loadError)
    ).not.toBeInTheDocument()
  })

  it('queues Merge all with a maximum of 5 concurrent merges', async () => {
    const entries = Array.from({ length: 7 }, (_, i) => [
      {
        addressBookId: DEFAULT_ADDRESS_BOOK_ID,
        contact: {
          id: `g${i}-a`,
          displayName: `Person ${i}`,
          emails: [{ type: null, value: `person${i}@twake.app` }],
          phones: []
        }
      },
      {
        addressBookId: 'personal1',
        contact: {
          id: `g${i}-b`,
          displayName: `Person ${i} Dup`,
          emails: [{ type: null, value: `person${i}@twake.app` }],
          phones: []
        }
      }
    ]).flat()

    mockFetchContactsPage.mockImplementation((_userId, book) =>
      Promise.resolve({
        entries:
          book?.id === DEFAULT_ADDRESS_BOOK_ID
            ? entries.filter(e => e.addressBookId === DEFAULT_ADDRESS_BOOK_ID)
            : entries.filter(e => e.addressBookId === 'personal1'),
        next: null
      })
    )

    let activeSaves = 0
    let maxConcurrentSaves = 0
    const resolvers: (() => void)[] = []

    mockSaveContact.mockImplementation(
      (_userId, _bookId, contact) =>
        new Promise(resolve => {
          activeSaves += 1
          maxConcurrentSaves = Math.max(maxConcurrentSaves, activeSaves)
          resolvers.push(() => {
            activeSaves -= 1
            resolve(contact)
          })
        })
    )

    renderMergePage()

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'Merge duplicates (7)' })
      ).toBeInTheDocument()
    })

    confirmMergeAll()

    await waitFor(() => {
      expect(resolvers).toHaveLength(5)
    })
    expect(maxConcurrentSaves).toBe(5)

    // Complete first batch of 5, which should start the remaining 2
    resolvers.splice(0, 5).forEach(resolve => resolve())

    await waitFor(() => {
      expect(resolvers).toHaveLength(2)
    })
    resolvers.splice(0, 2).forEach(resolve => resolve())

    await waitFor(() => {
      expect(screen.getAllByLabelText('Merged')).toHaveLength(7)
    })
    expect(maxConcurrentSaves).toBe(5)
    expect(mockSaveContact).toHaveBeenCalledTimes(7)
    expect(mockDeleteContact).toHaveBeenCalledTimes(7)
  })

  it('saves distinct X- properties from both snapshots when the listing omits them', async () => {
    renderMergePage()
    await screen.findByText('Isabella Martinez')
    const primaryProp: JCalProperty = ['x-custom', {}, 'text', 'First']
    const sourceProp: JCalProperty = ['x-custom', {}, 'text', 'Second']
    const originalRead = mockFetchContactForMerge.getMockImplementation()
    mockFetchContactForMerge.mockImplementation(async (book, id) => {
      if (!originalRead) throw new Error('Missing reader')
      const snapshot = await originalRead(book, id)
      const prop = id === 'c1' ? primaryProp : sourceProp
      return {
        ...snapshot,
        contact: { ...snapshot.contact, passthroughProps: [prop] }
      }
    })

    fireEvent.click(screen.getAllByRole('button', { name: 'Merge' })[0])

    await screen.findByText('Contacts merged')
    expect(
      screen.queryByText(en.contacts.merge.changedError)
    ).not.toBeInTheDocument()
    expect(mockSaveContact).toHaveBeenCalledWith(
      'u1',
      DEFAULT_ADDRESS_BOOK_ID,
      expect.objectContaining({
        passthroughProps: [primaryProp, sourceProp],
        etag: '"c1-v1"'
      }),
      'update'
    )
    expect(mockDeleteContact).toHaveBeenCalledWith(
      'u1',
      'personal1',
      'c3',
      '"c3-v1"'
    )
  })
})
