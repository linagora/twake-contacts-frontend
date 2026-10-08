/**
 * @jest-environment jsdom
 */
import { setupStore } from '@common/app/store'
import {
  fetchAddressBooks,
  fetchContactsForBook,
  moveContact as moveContactDao
} from './ContactsDao'
import { fetchContacts, fetchMoreContacts, moveContact } from './ContactsSlice'

jest.mock('./ContactsDao')

describe('fetchContacts', () => {
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

describe('moveContact', () => {
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
