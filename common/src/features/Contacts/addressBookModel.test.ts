import {
  AddressBookCapabilities,
  AddressBookKind,
  describeAddressBook,
  isOwnAddressBook,
  isSharedAddressBook
} from './addressBookModel'
import { RawAddressBook } from './contactsTypes'
import { AddressBookAccessLevel } from './davTypes'

const ME = 'me-id'
const OTHER = 'other-id'

const raw = (fields: Partial<RawAddressBook>): RawAddressBook => ({
  id: 'book',
  userId: ME,
  name: 'Book',
  contactsCount: 0,
  acl: [],
  canWrite: true,
  ...fields
})

const NOTHING: AddressBookCapabilities = {
  listedInSidebar: false,
  addContacts: false,
  editContacts: false,
  moveContactsOut: false,
  share: false,
  rename: false,
  delete: false,
  removeFromList: false
}

const WRITE_CONTACTS = {
  addContacts: true,
  editContacts: true,
  moveContactsOut: true
}

const delegated = (shareAccess: number, canWrite: boolean): RawAddressBook =>
  raw({
    id: 'copy',
    ownerId: OTHER,
    sourceBookId: 'src',
    shareAccess,
    canWrite
  })

interface Row {
  label: string
  book: RawAddressBook
  kind: AddressBookKind
  capabilities: Partial<AddressBookCapabilities>
}

// one row per kind and access level: a product rule about books is a row here
const ROWS: Row[] = [
  {
    label: 'the default book',
    book: raw({ id: 'contacts', isDefault: true }),
    kind: 'default',
    capabilities: { ...WRITE_CONTACTS, share: true, rename: true }
  },
  {
    label: 'an own book',
    book: raw({ id: 'family' }),
    kind: 'personal',
    capabilities: {
      ...WRITE_CONTACTS,
      listedInSidebar: true,
      share: true,
      rename: true,
      delete: true
    }
  },
  {
    label: 'an own book whose owner is the current user',
    book: raw({ id: 'family', ownerId: ME }),
    kind: 'personal',
    capabilities: {
      ...WRITE_CONTACTS,
      listedInSidebar: true,
      share: true,
      rename: true,
      delete: true
    }
  },
  {
    label: 'the collected book',
    book: raw({ id: 'collected' }),
    kind: 'collected',
    capabilities: {
      editContacts: true,
      moveContactsOut: true,
      share: true,
      rename: true
    }
  },
  {
    label: 'a book delegated read only (share-access 2)',
    book: delegated(AddressBookAccessLevel.Viewer, false),
    kind: 'delegated',
    capabilities: { listedInSidebar: true, removeFromList: true }
  },
  {
    label: 'a book delegated with no access (share-access 4)',
    book: delegated(AddressBookAccessLevel.None, false),
    kind: 'delegated',
    capabilities: { listedInSidebar: true, removeFromList: true }
  },
  {
    label: 'a book delegated read-write (share-access 3)',
    book: delegated(AddressBookAccessLevel.ReadWrite, true),
    kind: 'delegated',
    capabilities: {
      ...WRITE_CONTACTS,
      listedInSidebar: true,
      removeFromList: true
    }
  },
  {
    label: 'a book delegated to an Editor (share-access 5)',
    book: delegated(AddressBookAccessLevel.Editor, true),
    kind: 'delegated',
    capabilities: {
      ...WRITE_CONTACTS,
      listedInSidebar: true,
      share: true,
      removeFromList: true
    }
  },
  {
    label: 'a subscribed public book with dav:write',
    book: raw({
      id: 'sub',
      ownerId: OTHER,
      acl: ['dav:read', 'dav:write'],
      canWrite: true
    }),
    kind: 'subscribed',
    capabilities: {
      ...WRITE_CONTACTS,
      listedInSidebar: true,
      removeFromList: true
    }
  },
  {
    label: 'a subscribed public book without dav:write',
    book: raw({
      id: 'sub',
      ownerId: OTHER,
      acl: ['dav:read'],
      canWrite: false
    }),
    kind: 'subscribed',
    capabilities: { listedInSidebar: true, removeFromList: true }
  },
  {
    label: 'the domain book, writable',
    book: raw({ id: 'dab', userId: 'domain-id', canWrite: true }),
    kind: 'domain',
    capabilities: { listedInSidebar: true }
  },
  {
    label: 'the domain book, read only',
    book: raw({ id: 'dab', userId: 'domain-id', canWrite: false }),
    kind: 'domain',
    capabilities: { listedInSidebar: true }
  }
]

describe('describeAddressBook', () => {
  it.each(ROWS)('classifies $label', ({ book, kind, capabilities }) => {
    expect(describeAddressBook(book, ME)).toEqual({
      kind,
      capabilities: { ...NOTHING, ...capabilities }
    })
  })

  it('gives no write capability on an own book without write right', () => {
    const { capabilities } = describeAddressBook(
      raw({ id: 'family', canWrite: false }),
      ME
    )
    expect(capabilities).toEqual({
      ...NOTHING,
      listedInSidebar: true,
      share: true,
      delete: true
    })
  })
})

describe('isOwnAddressBook / isSharedAddressBook', () => {
  it.each(ROWS)('groups $label like the sidebar', ({ book, kind }) => {
    const described = describeAddressBook(book, ME)
    const shared = kind === 'delegated' || kind === 'subscribed'
    expect(isSharedAddressBook(described)).toBe(shared)
    expect(isOwnAddressBook(described)).toBe(!shared && kind !== 'domain')
  })
})
