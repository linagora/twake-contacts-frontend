/**
 * @jest-environment jsdom
 */
import { setupStore } from '@common/app/store'
import {
  deleteContact as deleteContactDao,
  fetchAddressBooks,
  fetchContact as fetchContactDao,
  fetchContactsPage,
  moveContact as moveContactDao,
  saveContact,
  subscribeToAddressBook
} from './ContactsDao'
import {
  createContact,
  deleteContact,
  fetchContact,
  fetchContacts,
  fetchMoreContacts,
  fetchUpdatedContacts,
  moveContact,
  setContactSort,
  subscribeAddressBook,
  updateContact
} from './ContactsSlice'
import { ALL_CONTACTS_LISTING, DEFAULT_CONTACT_SORT } from './constants'
import {
  AddressBookWithContacts,
  Contact,
  ContactEntry,
  ContactListing,
  ContactSort,
  ContactsState
} from './contactsTypes'

jest.mock('./ContactsDao')

const alice: Contact = { id: 'c1', displayName: 'Alice Roche', emails: [] }
const bob: Contact = { id: 'c2', displayName: 'Bob Martin', emails: [] }
const carl: Contact = { id: 'c3', displayName: 'Carl Dubois', emails: [] }
const dora: Contact = { id: 'c4', displayName: 'Dora Lenz', emails: [] }

const makeBook = (
  id: string,
  contacts: Contact[],
  contactsCount: number | null = contacts.length
): AddressBookWithContacts => ({
  id,
  userId: 'u1',
  name: id,
  contactsCount,
  acl: [],
  canWrite: true,
  contacts
})

// a listing of a single page, unless the starts of its pages are given
const makeListing = (
  refs: [string, Contact][],
  next: string | null = null,
  pages: ContactListing['pages'] = [{ after: null, refIndex: 0 }]
): ContactListing => ({
  refs: refs.map(([addressBookId, contact]) => ({
    addressBookId,
    contactId: contact.id
  })),
  pages,
  next,
  hasMore: next !== null,
  loadingRequestId: null
})

const makeStore = (
  addressBooks: Record<string, AddressBookWithContacts>,
  listings: Record<string, ContactListing> = {},
  sort: ContactSort = DEFAULT_CONTACT_SORT
): ReturnType<typeof setupStore> =>
  setupStore({
    contacts: {
      addressBooks,
      listings,
      sort,
      loading: false,
      error: null
    }
  })

const getListedIds = (state: ContactsState, listingKey: string): string[] =>
  state.listings[listingKey].refs.map(ref => ref.contactId)

describe('setContactSort', () => {
  it('restarts the listings, loaded in the previous order', () => {
    const store = makeStore(
      { book1: makeBook('book1', [alice]) },
      { book1: makeListing([['book1', alice]], 'cursor') }
    )

    store.dispatch(setContactSort({ by: 'email', order: 'desc' }))

    const state = store.getState().contacts
    expect(state.sort).toStrictEqual({ by: 'email', order: 'desc' })
    expect(state.listings).toStrictEqual({})
  })
})

describe('fetchContacts', () => {
  it('keeps the loaded contacts of the books loaded again', async () => {
    jest
      .mocked(fetchAddressBooks)
      .mockResolvedValue([makeBook('book1', [], null)])
    const store = makeStore(
      { book1: makeBook('book1', [alice]), gone: makeBook('gone', [bob]) },
      { book1: makeListing([['book1', alice]], 'cursor') }
    )

    await store.dispatch(fetchContacts({ userId: 'u1' }))

    const { addressBooks, listings } = store.getState().contacts
    expect(addressBooks.book1.contacts).toStrictEqual([alice])
    expect(addressBooks.gone).toBe(undefined)
    expect(listings.book1).toBe(undefined)
  })

  it('is loading until the address books are fetched', async () => {
    jest.mocked(fetchAddressBooks).mockResolvedValue([])
    const store = setupStore()

    expect(store.getState().contacts.loading).toBe(true)

    await store.dispatch(fetchContacts({ userId: 'bob' }))

    expect(store.getState().contacts.loading).toBe(false)
  })

  it('lists an empty book without loading it', async () => {
    jest
      .mocked(fetchAddressBooks)
      .mockResolvedValue([
        makeBook('empty', [], 0),
        makeBook('shared', [], null)
      ])
    const store = makeStore({})

    await store.dispatch(fetchContacts({ userId: 'u1' }))

    const { listings } = store.getState().contacts
    expect(listings.empty.hasMore).toBe(false)
    expect(listings.shared).toBe(undefined)
  })
})

describe('fetchContact', () => {
  it('adds a contact missing from the loaded pages of its book', async () => {
    jest.mocked(fetchContactDao).mockResolvedValue(bob)
    const store = makeStore({ book1: makeBook('book1', [alice]) })

    await store.dispatch(
      fetchContact({ addressBookId: 'book1', contactId: 'c2' })
    )

    const { contacts } = store.getState().contacts.addressBooks.book1
    expect(contacts.map(contact => contact.id)).toStrictEqual(['c1', 'c2'])
    expect(fetchContactDao).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'book1', userId: 'u1' }),
      'c2'
    )
  })

  it('does not request a contact already loaded', async () => {
    jest.mocked(fetchContactDao).mockClear()
    const store = makeStore({ book1: makeBook('book1', [alice]) })

    await store.dispatch(
      fetchContact({ addressBookId: 'book1', contactId: 'c1' })
    )

    expect(fetchContactDao).not.toHaveBeenCalled()
  })

  it('leaves the book unchanged when the contact cannot be fetched', async () => {
    jest.mocked(fetchContactDao).mockRejectedValue(new Error('Not found'))
    const store = makeStore({ book1: makeBook('book1', []) })

    await store.dispatch(
      fetchContact({ addressBookId: 'book1', contactId: 'gone' })
    )

    const state = store.getState().contacts
    expect(state.addressBooks.book1.contacts).toStrictEqual([])
    expect(state.error).toBeNull()
  })
})

describe('fetchMoreContacts', () => {
  it('requests the domain members only with the domain book', async () => {
    jest
      .mocked(fetchContactsPage)
      .mockResolvedValue({ entries: [], next: null })
    const store = makeStore({
      book1: makeBook('book1', []),
      dab: makeBook('dab', [])
    })

    await store.dispatch(
      fetchMoreContacts({ userId: 'u1', listingKey: ALL_CONTACTS_LISTING })
    )

    expect(fetchContactsPage).toHaveBeenLastCalledWith(
      'u1',
      null,
      { after: null, sort: DEFAULT_CONTACT_SORT },
      true
    )
  })

  it('ignores a request while the same listing is already loading', async () => {
    jest.mocked(fetchContactsPage).mockResolvedValue({
      entries: [{ addressBookId: 'book1', contact: bob }],
      next: null
    })
    const store = makeStore({ book1: makeBook('book1', []) })

    await Promise.all([
      store.dispatch(fetchMoreContacts({ userId: 'u1', listingKey: 'book1' })),
      store.dispatch(fetchMoreContacts({ userId: 'u1', listingKey: 'book1' }))
    ])

    expect(fetchContactsPage).toHaveBeenCalledTimes(1)
  })

  it('appends the page read from the cursor without repeating a contact', async () => {
    jest.mocked(fetchContactsPage).mockResolvedValue({
      entries: [
        { addressBookId: 'book1', contact: alice },
        { addressBookId: 'book1', contact: bob }
      ],
      next: 'cursor2'
    })
    const store = makeStore(
      { book1: makeBook('book1', [alice]) },
      { book1: makeListing([['book1', alice]], 'cursor1') }
    )

    await store.dispatch(
      fetchMoreContacts({ userId: 'u1', listingKey: 'book1' })
    )

    expect(fetchContactsPage).toHaveBeenLastCalledWith(
      'u1',
      expect.objectContaining({ id: 'book1' }),
      { after: 'cursor1', sort: DEFAULT_CONTACT_SORT },
      false
    )
    const state = store.getState().contacts
    expect(getListedIds(state, 'book1')).toStrictEqual(['c1', 'c2'])
    expect(state.listings.book1.next).toBe('cursor2')
    expect(state.listings.book1.pages).toStrictEqual([
      { after: null, refIndex: 0 },
      { after: 'cursor1', refIndex: 1 }
    ])
    expect(state.listings.book1.hasMore).toBe(true)
  })

  it('leaves out the contacts of address books it does not list', async () => {
    jest.spyOn(console, 'warn').mockImplementation(() => undefined)
    jest.mocked(fetchContactsPage).mockResolvedValue({
      entries: [
        { addressBookId: 'book1', contact: alice },
        { addressBookId: 'group-book', contact: bob }
      ],
      next: null
    })
    const store = makeStore({ book1: makeBook('book1', []) })

    await store.dispatch(
      fetchMoreContacts({ userId: 'u1', listingKey: ALL_CONTACTS_LISTING })
    )

    expect(fetchContactsPage).toHaveBeenLastCalledWith(
      'u1',
      null,
      { after: null, sort: DEFAULT_CONTACT_SORT },
      false
    )
    expect(
      getListedIds(store.getState().contacts, ALL_CONTACTS_LISTING)
    ).toStrictEqual(['c1'])
  })

  it('ignores a page that comes back after the books were loaded again', async () => {
    type Page = Awaited<ReturnType<typeof fetchContactsPage>>
    const resolvePages: ((page: Page) => void)[] = []
    jest
      .mocked(fetchContactsPage)
      .mockImplementation(
        () => new Promise<Page>(resolve => resolvePages.push(resolve))
      )
    jest
      .mocked(fetchAddressBooks)
      .mockResolvedValue([makeBook('book1', [], null)])
    const store = makeStore({ book1: makeBook('book1', []) })

    const stalePage = store.dispatch(
      fetchMoreContacts({ userId: 'u1', listingKey: 'book1' })
    )
    await store.dispatch(fetchContacts({ userId: 'u1' }))
    const freshPage = store.dispatch(
      fetchMoreContacts({ userId: 'u1', listingKey: 'book1' })
    )
    resolvePages[0]({
      entries: [{ addressBookId: 'book1', contact: alice }],
      next: null
    })
    await stalePage

    expect(getListedIds(store.getState().contacts, 'book1')).toStrictEqual([])

    resolvePages[1]({
      entries: [{ addressBookId: 'book1', contact: bob }],
      next: null
    })
    await freshPage

    expect(getListedIds(store.getState().contacts, 'book1')).toStrictEqual([
      'c2'
    ])
  })

  it('restarts a listing whose cursor is rejected from its first page', async () => {
    jest
      .mocked(fetchContactsPage)
      .mockRejectedValue({ response: { status: 400 }, message: 'Bad cursor' })
    const store = makeStore(
      { book1: makeBook('book1', [alice]) },
      { book1: makeListing([['book1', alice]], 'stale') }
    )

    await store.dispatch(
      fetchMoreContacts({ userId: 'u1', listingKey: 'book1' })
    )

    const state = store.getState().contacts
    expect(state.listings.book1).toEqual(
      expect.objectContaining({ refs: [], next: null, hasMore: true })
    )
    expect(state.error).toBe(null)
  })

  it('stops a restarted listing whose cursor is rejected again', async () => {
    jest
      .mocked(fetchContactsPage)
      .mockRejectedValue({ response: { status: 400 }, message: 'Bad cursor' })
    const store = makeStore(
      { book1: makeBook('book1', [alice]) },
      {
        book1: {
          ...makeListing([['book1', alice]], 'stale'),
          restarted: true
        }
      }
    )

    await store.dispatch(
      fetchMoreContacts({ userId: 'u1', listingKey: 'book1' })
    )

    const state = store.getState().contacts
    expect(getListedIds(state, 'book1')).toStrictEqual(['c1'])
    expect(state.listings.book1.hasMore).toBe(false)
    expect(state.error).not.toBe(null)
  })

  it('reports a page that fails and stops its listing', async () => {
    jest
      .mocked(fetchContactsPage)
      .mockRejectedValue({ response: { status: 400 }, message: 'Bad request' })
    const store = makeStore({ book1: makeBook('book1', []) })

    await store.dispatch(
      fetchMoreContacts({ userId: 'u1', listingKey: 'book1' })
    )

    const state = store.getState().contacts
    expect(state.listings.book1.refs).toStrictEqual([])
    expect(state.listings.book1.hasMore).toBe(false)
    expect(state.error).not.toBe(null)
  })
})

describe('createContact', () => {
  beforeEach(() => {
    jest.mocked(saveContact).mockResolvedValue()
  })

  it('places the contact at its sorted place among the loaded ones', async () => {
    const store = makeStore(
      { book1: makeBook('book1', [alice, carl]) },
      {
        [ALL_CONTACTS_LISTING]: makeListing(
          [
            ['book1', alice],
            ['book1', carl]
          ],
          'cursor'
        ),
        book1: makeListing(
          [
            ['book1', alice],
            ['book1', carl]
          ],
          'cursor'
        )
      }
    )

    await store.dispatch(
      createContact({ userId: 'u1', addressBookId: 'book1', contact: bob })
    )

    const state = store.getState().contacts
    expect(getListedIds(state, ALL_CONTACTS_LISTING)).toStrictEqual([
      'c1',
      'c2',
      'c3'
    ])
    expect(getListedIds(state, 'book1')).toStrictEqual(['c1', 'c2', 'c3'])
  })

  it('places the contact in the sort order, one without email last in descending order', async () => {
    const withEmail = (contact: Contact, email: string): Contact => ({
      ...contact,
      emails: [{ type: null, value: email }]
    })
    // the names in the opposite order of the emails
    const first = withEmail(alice, 'b@example.org')
    const second = withEmail(bob, 'a@example.org')
    const store = makeStore(
      { book1: makeBook('book1', [first, second]) },
      {
        book1: makeListing([
          ['book1', first],
          ['book1', second]
        ])
      },
      { by: 'email', order: 'desc' }
    )

    await store.dispatch(
      createContact({
        userId: 'u1',
        addressBookId: 'book1',
        contact: withEmail(dora, 'c@example.org')
      })
    )
    await store.dispatch(
      createContact({ userId: 'u1', addressBookId: 'book1', contact: carl })
    )

    expect(getListedIds(store.getState().contacts, 'book1')).toStrictEqual([
      'c4',
      'c1',
      'c2',
      'c3'
    ])
  })

  it('leaves a contact sorted after the loaded ones to the next pages', async () => {
    const store = makeStore(
      { book1: makeBook('book1', [alice]) },
      { book1: makeListing([['book1', alice]], 'cursor') }
    )

    await store.dispatch(
      createContact({ userId: 'u1', addressBookId: 'book1', contact: carl })
    )

    expect(getListedIds(store.getState().contacts, 'book1')).toStrictEqual([
      'c1'
    ])
  })

  it('moves the start of the next pages with the contacts placed or removed before them', async () => {
    const store = makeStore(
      { book1: makeBook('book1', [alice, carl]) },
      {
        book1: makeListing(
          [
            ['book1', alice],
            ['book1', carl]
          ],
          'p3',
          [
            { after: null, refIndex: 0 },
            { after: 'p2', refIndex: 1 }
          ]
        )
      }
    )
    const getPageStarts = (): number[] =>
      store.getState().contacts.listings.book1.pages.map(page => page.refIndex)

    await store.dispatch(
      createContact({ userId: 'u1', addressBookId: 'book1', contact: bob })
    )

    expect(getListedIds(store.getState().contacts, 'book1')).toStrictEqual([
      'c1',
      'c2',
      'c3'
    ])
    expect(getPageStarts()).toStrictEqual([0, 2])

    jest.mocked(deleteContactDao).mockResolvedValue()
    await store.dispatch(
      deleteContact({ userId: 'u1', addressBookId: 'book1', contactId: 'c1' })
    )

    expect(getPageStarts()).toStrictEqual([0, 1])
  })

  it('appends a contact sorted last to a complete listing', async () => {
    const store = makeStore(
      { book1: makeBook('book1', [alice]) },
      { book1: makeListing([['book1', alice]]) }
    )

    await store.dispatch(
      createContact({ userId: 'u1', addressBookId: 'book1', contact: carl })
    )

    expect(getListedIds(store.getState().contacts, 'book1')).toStrictEqual([
      'c1',
      'c3'
    ])
  })
})

describe('updateContact', () => {
  beforeEach(() => {
    jest.mocked(saveContact).mockResolvedValue()
  })

  it('moves a renamed contact to its new sorted place', async () => {
    const store = makeStore(
      { book1: makeBook('book1', [alice, bob]) },
      {
        book1: makeListing([
          ['book1', alice],
          ['book1', bob]
        ])
      }
    )

    await store.dispatch(
      updateContact({
        userId: 'u1',
        addressBookId: 'book1',
        contact: { ...alice, displayName: 'Zoe Roche' }
      })
    )

    const state = store.getState().contacts
    expect(getListedIds(state, 'book1')).toStrictEqual(['c2', 'c1'])
    expect(state.addressBooks.book1.contacts[0].displayName).toBe('Zoe Roche')
  })

  it('keeps the last loaded contact listed, as the next pages start after it', async () => {
    const store = makeStore(
      { book1: makeBook('book1', [alice, bob]) },
      {
        book1: makeListing(
          [
            ['book1', alice],
            ['book1', bob]
          ],
          'cursor'
        )
      }
    )

    await store.dispatch(
      updateContact({
        userId: 'u1',
        addressBookId: 'book1',
        contact: { ...bob, emails: [{ type: null, value: 'bob@twake.app' }] }
      })
    )

    expect(getListedIds(store.getState().contacts, 'book1')).toStrictEqual([
      'c1',
      'c2'
    ])
  })
})

describe('deleteContact', () => {
  it('removes the contact from its book and from the listings', async () => {
    jest.mocked(deleteContactDao).mockResolvedValue()
    const store = makeStore(
      { book1: makeBook('book1', [alice, bob]) },
      {
        [ALL_CONTACTS_LISTING]: makeListing(
          [
            ['book1', alice],
            ['book1', bob]
          ],
          'cursor'
        ),
        book1: makeListing([
          ['book1', alice],
          ['book1', bob]
        ])
      }
    )

    await store.dispatch(
      deleteContact({ userId: 'u1', addressBookId: 'book1', contactId: 'c1' })
    )

    const state = store.getState().contacts
    expect(state.addressBooks.book1.contacts).toStrictEqual([bob])
    expect(state.addressBooks.book1.contactsCount).toBe(1)
    expect(getListedIds(state, ALL_CONTACTS_LISTING)).toStrictEqual(['c2'])
    expect(getListedIds(state, 'book1')).toStrictEqual(['c2'])
  })
})

describe('moveContact', () => {
  beforeEach(() => {
    jest.mocked(moveContactDao).mockResolvedValue()
  })

  it('moves the contact to the target book and its listings', async () => {
    const store = makeStore(
      { book1: makeBook('book1', [alice]), book2: makeBook('book2', [bob]) },
      {
        [ALL_CONTACTS_LISTING]: makeListing([
          ['book1', alice],
          ['book2', bob]
        ]),
        book1: makeListing([['book1', alice]]),
        book2: makeListing([['book2', bob]])
      }
    )

    await store.dispatch(
      moveContact({
        userId: 'u1',
        fromAddressBookId: 'book1',
        toAddressBookId: 'book2',
        contact: alice
      })
    )

    const state = store.getState().contacts
    expect(state.addressBooks.book1.contacts).toHaveLength(0)
    expect(state.addressBooks.book1.contactsCount).toBe(0)
    expect(state.addressBooks.book2.contactsCount).toBe(2)
    expect(getListedIds(state, 'book1')).toStrictEqual([])
    expect(getListedIds(state, 'book2')).toStrictEqual(['c1', 'c2'])
    expect(state.listings[ALL_CONTACTS_LISTING].refs[0]).toStrictEqual({
      addressBookId: 'book2',
      contactId: 'c1'
    })
  })

  it('replaces the contact if it already exists in the target book', async () => {
    const store = makeStore({
      book1: makeBook('book1', [alice]),
      book2: makeBook('book2', [{ ...alice, displayName: 'Alice Old' }])
    })

    await store.dispatch(
      moveContact({
        userId: 'u1',
        fromAddressBookId: 'book1',
        toAddressBookId: 'book2',
        contact: { ...alice, displayName: 'Alice Updated' }
      })
    )

    const { addressBooks } = store.getState().contacts
    expect(addressBooks.book1.contacts).toHaveLength(0)
    expect(addressBooks.book2.contacts[0].displayName).toBe('Alice Updated')
    expect(addressBooks.book2.contactsCount).toBe(1)
  })

  it('does not change contactsCount when it is null', async () => {
    const store = makeStore({
      book1: makeBook('book1', [alice], null),
      book2: makeBook('book2', [], null)
    })

    await store.dispatch(
      moveContact({
        userId: 'u1',
        fromAddressBookId: 'book1',
        toAddressBookId: 'book2',
        contact: alice
      })
    )

    const { addressBooks } = store.getState().contacts
    expect(addressBooks.book1.contactsCount).toBeNull()
    expect(addressBooks.book2.contactsCount).toBeNull()
  })

  it('sets an error when the move fails', async () => {
    jest.mocked(moveContactDao).mockRejectedValue(new Error('Move failed'))
    const store = makeStore({ book1: makeBook('book1', [alice]) })

    await store.dispatch(
      moveContact({
        userId: 'u1',
        fromAddressBookId: 'book1',
        toAddressBookId: 'book2',
        contact: alice
      })
    )

    expect(store.getState().contacts.error).toBe('Move failed')
  })
})

describe('fetchUpdatedContacts', () => {
  it('reloads the last two pages of the listings showing the book', async () => {
    jest
      .mocked(fetchContactsPage)
      .mockResolvedValueOnce({
        entries: [
          { addressBookId: 'book1', contact: { ...bob, displayName: 'Bo' } },
          { addressBookId: 'book1', contact: dora }
        ],
        next: 'n3'
      })
      .mockResolvedValueOnce({
        entries: [{ addressBookId: 'book1', contact: carl }],
        next: 'n4'
      })
    const store = makeStore(
      { book1: makeBook('book1', [alice, bob, carl]) },
      {
        book1: makeListing(
          [
            ['book1', alice],
            ['book1', bob],
            ['book1', carl]
          ],
          'p4',
          [
            { after: null, refIndex: 0 },
            { after: 'p2', refIndex: 1 },
            { after: 'p3', refIndex: 2 }
          ]
        )
      }
    )

    await store.dispatch(
      fetchUpdatedContacts({ userId: 'u1', bookId: 'book1', newSyncToken: 7 })
    )

    expect(fetchContactsPage).toHaveBeenNthCalledWith(
      1,
      'u1',
      expect.objectContaining({ id: 'book1' }),
      { after: 'p2', sort: DEFAULT_CONTACT_SORT },
      false
    )
    expect(fetchContactsPage).toHaveBeenNthCalledWith(
      2,
      'u1',
      expect.objectContaining({ id: 'book1' }),
      { after: 'n3', sort: DEFAULT_CONTACT_SORT },
      false
    )
    const state = store.getState().contacts
    expect(getListedIds(state, 'book1')).toStrictEqual(['c1', 'c2', 'c4', 'c3'])
    expect(state.listings.book1.pages).toStrictEqual([
      { after: null, refIndex: 0 },
      { after: 'p2', refIndex: 1 },
      { after: 'n3', refIndex: 3 }
    ])
    expect(state.listings.book1.next).toBe('n4')
    expect(state.addressBooks.book1.contacts[1].displayName).toBe('Bo')
    expect(state.addressBooks.book1.syncToken).toBe(7)
  })

  it('reloads the listing of every book too', async () => {
    jest.mocked(fetchContactsPage).mockResolvedValue({
      entries: [{ addressBookId: 'book1', contact: bob }],
      next: null
    })
    const store = makeStore(
      { book1: makeBook('book1', [alice]) },
      { [ALL_CONTACTS_LISTING]: makeListing([['book1', alice]]) }
    )

    await store.dispatch(
      fetchUpdatedContacts({ userId: 'u1', bookId: 'book1', newSyncToken: 7 })
    )

    expect(fetchContactsPage).toHaveBeenLastCalledWith(
      'u1',
      null,
      { after: null, sort: DEFAULT_CONTACT_SORT },
      false
    )
    expect(
      getListedIds(store.getState().contacts, ALL_CONTACTS_LISTING)
    ).toStrictEqual(['c2'])
  })

  it('loads the first page of the listing of an empty book', async () => {
    jest.mocked(fetchContactsPage).mockResolvedValue({
      entries: [{ addressBookId: 'book1', contact: alice }],
      next: null
    })
    const store = makeStore(
      { book1: makeBook('book1', []) },
      { book1: makeListing([], null, []) }
    )

    await store.dispatch(
      fetchUpdatedContacts({ userId: 'u1', bookId: 'book1', newSyncToken: 7 })
    )

    expect(fetchContactsPage).toHaveBeenLastCalledWith(
      'u1',
      expect.objectContaining({ id: 'book1' }),
      { after: null, sort: DEFAULT_CONTACT_SORT },
      false
    )
    const state = store.getState().contacts
    expect(getListedIds(state, 'book1')).toStrictEqual(['c1'])
    expect(state.listings.book1.pages).toStrictEqual([
      { after: null, refIndex: 0 }
    ])
    expect(state.addressBooks.book1.syncToken).toBe(7)
  })

  it('drops a reload read in the order the listings left meanwhile', async () => {
    let resolveReload: (page: {
      entries: ContactEntry[]
      next: string | null
    }) => void = () => undefined
    jest
      .mocked(fetchContactsPage)
      .mockReturnValueOnce(new Promise(resolve => (resolveReload = resolve)))
      .mockResolvedValueOnce({
        entries: [{ addressBookId: 'book1', contact: bob }],
        next: null
      })
    const store = makeStore(
      { book1: makeBook('book1', [alice, bob]) },
      { book1: makeListing([['book1', alice]]) }
    )

    const reload = store.dispatch(
      fetchUpdatedContacts({ userId: 'u1', bookId: 'book1', newSyncToken: 7 })
    )
    store.dispatch(setContactSort({ by: 'email', order: 'asc' }))
    await store.dispatch(
      fetchMoreContacts({ userId: 'u1', listingKey: 'book1' })
    )
    resolveReload({
      entries: [{ addressBookId: 'book1', contact: alice }],
      next: null
    })
    await reload

    expect(getListedIds(store.getState().contacts, 'book1')).toStrictEqual([
      'c2'
    ])
  })

  it('skips a change already loaded', async () => {
    jest.mocked(fetchContactsPage).mockClear()
    const store = makeStore(
      { book1: { ...makeBook('book1', [alice]), syncToken: 7 } },
      { book1: makeListing([['book1', alice]]) }
    )

    await store.dispatch(
      fetchUpdatedContacts({ userId: 'u1', bookId: 'book1', newSyncToken: 7 })
    )

    expect(fetchContactsPage).not.toHaveBeenCalled()
  })

  it('leaves a listing loading another page meanwhile, for the same push to reload it', async () => {
    jest.mocked(fetchContactsPage).mockResolvedValue({
      entries: [{ addressBookId: 'book1', contact: bob }],
      next: null
    })
    const store = makeStore(
      { book1: makeBook('book1', [alice]) },
      {
        book1: {
          ...makeListing([['book1', alice]], 'p2'),
          loadingRequestId: 'page-in-flight'
        }
      }
    )

    await store.dispatch(
      fetchUpdatedContacts({ userId: 'u1', bookId: 'book1', newSyncToken: 7 })
    )

    expect(getListedIds(store.getState().contacts, 'book1')).toStrictEqual([
      'c1'
    ])
    expect(store.getState().contacts.addressBooks.book1.syncToken).toBe(
      undefined
    )
  })
})

describe('subscribeAddressBook', () => {
  it('adds the book and restarts My contacts to list its contacts', async () => {
    const subscribed = makeBook('subscribed', [], null)
    jest.mocked(subscribeToAddressBook).mockResolvedValue(subscribed)
    const store = makeStore(
      { book1: makeBook('book1', [alice]) },
      {
        [ALL_CONTACTS_LISTING]: makeListing([['book1', alice]]),
        book1: makeListing([['book1', alice]])
      }
    )

    await store.dispatch(
      subscribeAddressBook({ userId: 'u1', source: makeBook('source', []) })
    )

    const { addressBooks, listings } = store.getState().contacts
    expect(addressBooks.subscribed).toStrictEqual({ ...subscribed })
    expect(listings[ALL_CONTACTS_LISTING]).toBe(undefined)
    expect(getListedIds(store.getState().contacts, 'book1')).toStrictEqual([
      'c1'
    ])
  })
})
