/**
 * Builders of the domain objects and store state used by the tests: the only
 * place their literal shapes are written. Every builder returns a valid
 * object, tests override only the fields their case is about.
 *
 * Type-only imports of the slices: the builders must load in the `node`
 * test environment, where the slices reading `localStorage` cannot.
 */
import type { LoadingState } from '@common/app/loadingSlice'
import type { RootState } from '@common/app/store'
import {
  COLLECTED_ADDRESS_BOOK_ID,
  DEFAULT_ADDRESS_BOOK_ID,
  DEFAULT_CONTACT_SORT,
  READ_ONLY_SHARE_ACCESSES
} from '@common/features/Contacts/constants'
import type {
  AddressBookWithContacts,
  Contact,
  ContactListing,
  ContactRef,
  ContactsState
} from '@common/features/Contacts/contactsTypes'
import { AddressBookAccessLevel } from '@common/features/Contacts/davTypes'
import type { SettingsState } from '@common/features/Settings/SettingsSlice'
import type { UserState } from '@common/features/User/UserSlice'
import type { userData } from '@common/features/User/userDataTypes'

export const TEST_USER_ID = 'u1'
export const OTHER_USER_ID = 'u2'
export const DOMAIN_ADDRESS_BOOK_ID = 'dab'

type BookOverrides = Partial<AddressBookWithContacts>

export const aContact = (overrides: Partial<Contact> = {}): Contact => ({
  id: 'c1',
  displayName: 'Alice Roche',
  emails: [],
  ...overrides
})

/**
 * A writable book of the test user. Its name defaults to its id and its
 * contacts count to the number of its contacts.
 */
export const anAddressBook = (
  overrides: BookOverrides = {}
): AddressBookWithContacts => {
  const id = overrides.id ?? 'book1'
  const contacts = overrides.contacts ?? []
  return {
    id,
    userId: TEST_USER_ID,
    name: id,
    contactsCount: contacts.length,
    acl: [],
    canWrite: true,
    contacts,
    ...overrides
  }
}

/** The test user's default book, named by the UI: its name is empty. */
export const theDefaultBook = (
  overrides: BookOverrides = {}
): AddressBookWithContacts =>
  anAddressBook({
    id: DEFAULT_ADDRESS_BOOK_ID,
    name: '',
    isDefault: true,
    ...overrides
  })

/** The internal book of the addresses collected from the sent emails. */
export const theCollectedBook = (
  overrides: BookOverrides = {}
): AddressBookWithContacts =>
  anAddressBook({ id: COLLECTED_ADDRESS_BOOK_ID, ...overrides })

/** The domain address book, read-only for the users. */
export const aDomainBook = (
  overrides: BookOverrides = {}
): AddressBookWithContacts =>
  anAddressBook({
    id: DOMAIN_ADDRESS_BOOK_ID,
    userId: 'domain1',
    name: '',
    contactsCount: null,
    canWrite: false,
    ...overrides
  })

/**
 * A book another user delegated to the test user, writable unless its
 * `access` is a read-only one. The server reports no contacts count for it.
 */
export const aSharedBook = ({
  access = AddressBookAccessLevel.Viewer,
  ...overrides
}: BookOverrides & {
  access?: AddressBookAccessLevel
} = {}): AddressBookWithContacts =>
  anAddressBook({
    id: 'shared1',
    ownerId: OTHER_USER_ID,
    sourceBookId: 'source1',
    contactsCount: null,
    canWrite: !READ_ONLY_SHARE_ACCESSES.includes(access),
    shareAccess: access,
    ...overrides
  })

/** A public book of another user the test user subscribed to. */
export const aSubscribedBook = (
  overrides: BookOverrides = {}
): AddressBookWithContacts =>
  anAddressBook({
    id: 'subscribed1',
    ownerId: OTHER_USER_ID,
    sourceBookId: 'source1',
    contactsCount: null,
    acl: ['dav:read'],
    canWrite: false,
    ...overrides
  })

export const aRef = (addressBookId: string, contact: Contact): ContactRef => ({
  addressBookId,
  contactId: contact.id
})

/**
 * A listing of a single, last, page unless overridden. `hasMore` follows the
 * `next` cursor.
 */
export const aListing = (
  refs: ContactRef[] = [],
  overrides: Partial<ContactListing> = {}
): ContactListing => {
  const next = overrides.next ?? null
  return {
    refs,
    pages: [{ after: null, refIndex: 0 }],
    next,
    hasMore: next !== null,
    loadingRequestId: null,
    ...overrides
  }
}

export const aUser = (overrides: Partial<userData> = {}): userData => ({
  email: 'alice@example.com',
  family_name: 'Roche',
  given_name: 'Alice',
  name: 'Alice Roche',
  sid: 'session1',
  sub: 'alice',
  openpaasId: TEST_USER_ID,
  ...overrides
})

export interface StoreStateOverrides {
  contacts?: Partial<ContactsState>
  user?: Partial<UserState>
  settings?: Partial<SettingsState>
  loading?: Partial<LoadingState>
}

/** A loaded store: the user is known and the address books are fetched. */
export const aStoreState = (
  overrides: StoreStateOverrides = {}
): RootState => ({
  contacts: {
    addressBooks: {},
    listings: {},
    sort: DEFAULT_CONTACT_SORT,
    loading: false,
    error: null,
    ...overrides.contacts
  },
  user: {
    userData: aUser(),
    tokens: null,
    coreConfig: { language: null, datetime: { timeZone: null } },
    loading: false,
    error: null,
    ...overrides.user
  },
  settings: { language: 'en', themeMode: 'light', ...overrides.settings },
  loading: { isLoading: false, ...overrides.loading }
})

/** Indexes books by id, as the store does. */
export const byId = (
  ...books: AddressBookWithContacts[]
): Record<string, AddressBookWithContacts> =>
  Object.fromEntries(books.map(book => [book.id, book]))
