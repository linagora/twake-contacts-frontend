/**
 * @jest-environment jsdom
 */
import { AppStore, RootState, setupStore } from '@common/app/store'
import {
  deleteContact as deleteContactDao,
  fetchAddressBooks,
  fetchContact as fetchContactDao,
  fetchContactsForBook,
  moveContact as moveContactDao,
  saveContact
} from './ContactsDao'
import {
  createContact,
  deleteContact,
  fetchContact,
  fetchContacts,
  fetchMoreContacts,
  moveContact,
  updateContact
} from './ContactsSlice'

jest.mock('./ContactsDao')

describe('fetchContacts', () => {
  it('is loading until the address books are fetched', async () => {
    jest.mocked(fetchAddressBooks).mockResolvedValue([])
    const store = setupStore()

    expect(store.getState().contacts.loading).toBe(true)

    await store.dispatch(fetchContacts({ userId: 'bob' }))

    expect(store.getState().contacts.loading).toBe(false)
  })

  it('loads the contacts of a shared book whose count is unknown', async () => {
    jest.mocked(fetchAddressBooks).mockResolvedValue([
      {
        id: 'shared',
        userId: 'alice',
        name: 'Team RW',
        contactsCount: null,
        acl: [],
        canWrite: true
      }
    ])
    jest.mocked(fetchContactsForBook).mockResolvedValue({
      contacts: [{ id: 'c1', displayName: 'Shared Sam', emails: [] }],
      hasMore: false
    })
    const store = setupStore()

    await store.dispatch(fetchContacts({ userId: 'bob' }))

    const { contacts } = store.getState().contacts.addressBooks.shared
    expect(contacts.map(contact => contact.id)).toStrictEqual(['c1'])
  })

  it('does not request a book known to be empty', async () => {
    jest.mocked(fetchContactsForBook).mockClear()
    jest.mocked(fetchAddressBooks).mockResolvedValue([
      {
        id: 'empty',
        userId: 'bob',
        name: 'Empty',
        contactsCount: 0,
        acl: [],
        canWrite: true
      }
    ])
    const store = setupStore()

    await store.dispatch(fetchContacts({ userId: 'bob' }))

    expect(fetchContactsForBook).not.toHaveBeenCalled()
    expect(store.getState().contacts.addressBooks.empty.hasMore).toBe(false)
  })
})

describe('fetchContact', () => {
  const book = {
    id: 'contacts',
    userId: 'bob',
    name: 'My contacts',
    contactsCount: 60,
    acl: [],
    canWrite: true,
    offset: 50,
    hasMore: true
  }

  it('adds a contact missing from the loaded pages of its book', async () => {
    jest.mocked(fetchContactDao).mockResolvedValue({
      id: 'c60',
      displayName: 'Search Own',
      emails: []
    })
    const store = setupStore({
      contacts: {
        addressBooks: {
          contacts: {
            ...book,
            contacts: [{ id: 'c1', displayName: 'Bulk 001', emails: [] }]
          }
        },
        loading: false,
        error: null
      }
    })

    await store.dispatch(
      fetchContact({ addressBookId: 'contacts', contactId: 'c60' })
    )

    const { contacts } = store.getState().contacts.addressBooks.contacts
    expect(contacts.map(contact => contact.id)).toStrictEqual(['c1', 'c60'])
    expect(fetchContactDao).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'contacts', userId: 'bob' }),
      'c60'
    )
  })

  it('does not request a contact already loaded', async () => {
    jest.mocked(fetchContactDao).mockClear()
    const store = setupStore({
      contacts: {
        addressBooks: {
          contacts: {
            ...book,
            contacts: [{ id: 'c1', displayName: 'Bulk 001', emails: [] }]
          }
        },
        loading: false,
        error: null
      }
    })

    await store.dispatch(
      fetchContact({ addressBookId: 'contacts', contactId: 'c1' })
    )

    expect(fetchContactDao).not.toHaveBeenCalled()
  })

  it('leaves the book unchanged when the contact cannot be fetched', async () => {
    jest.mocked(fetchContactDao).mockRejectedValue(new Error('Not found'))
    const store = setupStore({
      contacts: {
        addressBooks: { contacts: { ...book, contacts: [] } },
        loading: false,
        error: null
      }
    })

    await store.dispatch(
      fetchContact({ addressBookId: 'contacts', contactId: 'gone' })
    )

    const state = store.getState().contacts
    expect(state.addressBooks.contacts.contacts).toStrictEqual([])
    expect(state.error).toBeNull()
  })
})

describe('fetchMoreContacts', () => {
  it('ignores a request while the same book is already loading more', async () => {
    jest.mocked(fetchContactsForBook).mockResolvedValue({
      contacts: [{ id: 'c2', displayName: 'Bob Martin', emails: [] }],
      hasMore: false
    })
    const store = setupStore({
      contacts: {
        addressBooks: {
          book1: {
            id: 'book1',
            userId: 'u1',
            name: 'Book 1',
            contactsCount: 2,
            acl: [],
            canWrite: true,
            contacts: [{ id: 'c1', displayName: 'Alice Roche', emails: [] }],
            offset: 1,
            hasMore: true
          }
        },
        loading: false,
        error: null
      }
    })

    await Promise.all([
      store.dispatch(fetchMoreContacts({ userId: 'u1', bookId: 'book1' })),
      store.dispatch(fetchMoreContacts({ userId: 'u1', bookId: 'book1' }))
    ])

    expect(fetchContactsForBook).toHaveBeenCalledTimes(1)
    expect(store.getState().contacts.addressBooks.book1.contacts).toHaveLength(
      2
    )
  })

  it('drops contacts of the next page that are already loaded', async () => {
    jest.mocked(fetchContactsForBook).mockResolvedValue({
      contacts: [
        { id: 'c1', displayName: 'Alice Roche', emails: [] },
        { id: 'c2', displayName: 'Bob Martin', emails: [] }
      ],
      hasMore: false
    })
    const store = setupStore({
      contacts: {
        addressBooks: {
          book1: {
            id: 'book1',
            userId: 'u1',
            name: 'Book 1',
            contactsCount: 2,
            acl: [],
            canWrite: true,
            contacts: [{ id: 'c1', displayName: 'Alice Roche', emails: [] }],
            offset: 1,
            hasMore: true
          }
        },
        loading: false,
        error: null
      }
    })

    await store.dispatch(fetchMoreContacts({ userId: 'u1', bookId: 'book1' }))

    const { contacts, offset } = store.getState().contacts.addressBooks.book1
    expect(contacts.map(contact => contact.id)).toStrictEqual(['c1', 'c2'])
    expect(offset).toBe(3)
  })
})

describe('deleteContact', () => {
  it('fetches the next page right after the remaining loaded contacts', async () => {
    jest.mocked(deleteContactDao).mockResolvedValue()
    jest.mocked(fetchContactsForBook).mockResolvedValue({
      contacts: [{ id: 'c3', displayName: 'Carl Dubois', emails: [] }],
      hasMore: false,
      syncToken: 1
    })
    const store = setupStore({
      contacts: {
        addressBooks: {
          book1: {
            id: 'book1',
            userId: 'u1',
            name: 'Book 1',
            contactsCount: 3,
            acl: [],
            canWrite: true,
            contacts: [
              { id: 'c1', displayName: 'Alice Roche', emails: [] },
              { id: 'c2', displayName: 'Bob Martin', emails: [] }
            ],
            offset: 2,
            hasMore: true
          }
        },
        loading: false,
        error: null
      }
    })

    await store.dispatch(
      deleteContact({ userId: 'u1', addressBookId: 'book1', contactId: 'c1' })
    )
    const book = store.getState().contacts.addressBooks.book1
    expect(book.contacts.map(contact => contact.id)).toEqual(['c2'])
    expect(book.contactsCount).toBe(2)

    await store.dispatch(fetchMoreContacts({ userId: 'u1', bookId: 'book1' }))

    expect(fetchContactsForBook).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: 'book1' }),
      'u1',
      50,
      1
    )
  })
})

describe('updateContact', () => {
  it('updates the contact in the address book', async () => {
    jest.mocked(saveContact).mockResolvedValue()
    const store = setupStore({
      contacts: {
        addressBooks: {
          book1: {
            id: 'book1',
            userId: 'u1',
            name: 'Book 1',
            contactsCount: 1,
            acl: [],
            canWrite: true,
            contacts: [{ id: 'c1', displayName: 'Alice Roche', emails: [] }],
            offset: 1,
            hasMore: false
          }
        },
        loading: false,
        error: null
      }
    })

    await store.dispatch(
      updateContact({
        userId: 'u1',
        addressBookId: 'book1',
        contact: { id: 'c1', displayName: 'Alice Updated', emails: [] }
      })
    )

    const contact = store.getState().contacts.addressBooks.book1.contacts[0]
    expect(contact.displayName).toBe('Alice Updated')
  })
})

const bookWith = (
  contacts: { id: string; displayName: string }[]
): Partial<RootState> => ({
  contacts: {
    addressBooks: {
      book1: {
        id: 'book1',
        userId: 'u1',
        name: 'Book 1',
        contactsCount: contacts.length,
        acl: [],
        canWrite: true,
        contacts: contacts.map(contact => ({ ...contact, emails: [] })),
        offset: contacts.length,
        hasMore: false
      }
    },
    loading: false,
    error: null
  }
})

describe('contact order after a save', () => {
  const displayNames = (store: AppStore): string[] =>
    store
      .getState()
      .contacts.addressBooks.book1.contacts.map(contact => contact.displayName)

  it('inserts a created contact at its sorted position', async () => {
    jest.mocked(saveContact).mockResolvedValue()
    const store = setupStore(
      bookWith([
        { id: 'aaron', displayName: 'Aaron Analyse' },
        { id: 'rita', displayName: 'Read Only Rita' }
      ])
    )

    await store.dispatch(
      createContact({
        userId: 'u1',
        addressBookId: 'book1',
        contact: { id: 'abel', displayName: 'Abel Second', emails: [] }
      })
    )

    expect(displayNames(store)).toEqual([
      'Aaron Analyse',
      'Abel Second',
      'Read Only Rita'
    ])
    expect(store.getState().contacts.addressBooks.book1.contactsCount).toBe(3)
  })

  it('moves a renamed contact to its sorted position', async () => {
    jest.mocked(saveContact).mockResolvedValue()
    const store = setupStore(
      bookWith([
        { id: 'aaron', displayName: 'Aaron Analyse' },
        { id: 'abel', displayName: 'Abel Second' },
        { id: 'rita', displayName: 'Read Only Rita' }
      ])
    )

    await store.dispatch(
      updateContact({
        userId: 'u1',
        addressBookId: 'book1',
        contact: { id: 'abel', displayName: 'Zoe Second', emails: [] }
      })
    )

    expect(displayNames(store)).toEqual([
      'Aaron Analyse',
      'Read Only Rita',
      'Zoe Second'
    ])
  })
})

describe('moveContact', () => {
  it('removes the contact from the source book and adds it to the target book', async () => {
    jest.mocked(moveContactDao).mockResolvedValue()
    const store = setupStore({
      contacts: {
        addressBooks: {
          book1: {
            id: 'book1',
            userId: 'u1',
            name: 'Book 1',
            contactsCount: 1,
            acl: [],
            canWrite: true,
            contacts: [{ id: 'c1', displayName: 'Alice Roche', emails: [] }],
            offset: 1,
            hasMore: false
          },
          book2: {
            id: 'book2',
            userId: 'u1',
            name: 'Book 2',
            contactsCount: 0,
            acl: [],
            canWrite: true,
            contacts: [],
            offset: 0,
            hasMore: false
          }
        },
        loading: false,
        error: null
      }
    })

    await store.dispatch(
      moveContact({
        userId: 'u1',
        fromAddressBookId: 'book1',
        toAddressBookId: 'book2',
        contact: { id: 'c1', displayName: 'Alice Roche', emails: [] }
      })
    )

    expect(store.getState().contacts.addressBooks.book1.contacts).toHaveLength(
      0
    )
    expect(store.getState().contacts.addressBooks.book1.contactsCount).toBe(0)
    expect(store.getState().contacts.addressBooks.book2.contacts).toHaveLength(
      1
    )
    expect(store.getState().contacts.addressBooks.book2.contactsCount).toBe(1)
  })

  it('replaces the contact if it already exists in the target book', async () => {
    jest.mocked(moveContactDao).mockResolvedValue()
    const store = setupStore({
      contacts: {
        addressBooks: {
          book1: {
            id: 'book1',
            userId: 'u1',
            name: 'Book 1',
            contactsCount: 1,
            acl: [],
            canWrite: true,
            contacts: [{ id: 'c1', displayName: 'Alice Roche', emails: [] }],
            offset: 1,
            hasMore: false
          },
          book2: {
            id: 'book2',
            userId: 'u1',
            name: 'Book 2',
            contactsCount: 1,
            acl: [],
            canWrite: true,
            contacts: [{ id: 'c1', displayName: 'Alice Old', emails: [] }],
            offset: 1,
            hasMore: false
          }
        },
        loading: false,
        error: null
      }
    })

    await store.dispatch(
      moveContact({
        userId: 'u1',
        fromAddressBookId: 'book1',
        toAddressBookId: 'book2',
        contact: { id: 'c1', displayName: 'Alice Updated', emails: [] }
      })
    )

    expect(store.getState().contacts.addressBooks.book1.contacts).toHaveLength(
      0
    )
    const targetContact =
      store.getState().contacts.addressBooks.book2.contacts[0]
    expect(targetContact.displayName).toBe('Alice Updated')
    expect(store.getState().contacts.addressBooks.book2.contactsCount).toBe(1)
  })

  it('does not change contactsCount when it is null', async () => {
    jest.mocked(moveContactDao).mockResolvedValue()
    const store = setupStore({
      contacts: {
        addressBooks: {
          book1: {
            id: 'book1',
            userId: 'u1',
            name: 'Book 1',
            contactsCount: null,
            acl: [],
            canWrite: true,
            contacts: [{ id: 'c1', displayName: 'Alice Roche', emails: [] }],
            offset: 1,
            hasMore: false
          },
          book2: {
            id: 'book2',
            userId: 'u1',
            name: 'Book 2',
            contactsCount: null,
            acl: [],
            canWrite: true,
            contacts: [],
            offset: 0,
            hasMore: false
          }
        },
        loading: false,
        error: null
      }
    })

    await store.dispatch(
      moveContact({
        userId: 'u1',
        fromAddressBookId: 'book1',
        toAddressBookId: 'book2',
        contact: { id: 'c1', displayName: 'Alice Roche', emails: [] }
      })
    )

    expect(
      store.getState().contacts.addressBooks.book1.contactsCount
    ).toBeNull()
    expect(
      store.getState().contacts.addressBooks.book2.contactsCount
    ).toBeNull()
  })

  it('sets an error when the move fails', async () => {
    jest.mocked(moveContactDao).mockRejectedValue(new Error('Move failed'))
    const store = setupStore({
      contacts: {
        addressBooks: {
          book1: {
            id: 'book1',
            userId: 'u1',
            name: 'Book 1',
            contactsCount: 1,
            acl: [],
            canWrite: true,
            contacts: [{ id: 'c1', displayName: 'Alice Roche', emails: [] }],
            offset: 1,
            hasMore: false
          }
        },
        loading: false,
        error: null
      }
    })

    await store.dispatch(
      moveContact({
        userId: 'u1',
        fromAddressBookId: 'book1',
        toAddressBookId: 'book2',
        contact: { id: 'c1', displayName: 'Alice Roche', emails: [] }
      })
    )

    expect(store.getState().contacts.error).toBe('Move failed')
  })
})
