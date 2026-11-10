import {
  COLLECTED_ADDRESS_BOOK_ID,
  DEFAULT_ADDRESS_BOOK_ID,
  DOMAIN_ADDRESS_BOOK_ID
} from './constants'
import { RawAddressBook } from './contactsTypes'
import { AddressBookAccessLevel } from './davTypes'

/**
 * What an address book is to the current user:
 * - default: their default book, listed under My contacts only
 * - personal: their other own books
 * - collected: the internal book of the addresses collected from sent emails
 * - delegated: a book shared with them, with an access level
 * - subscribed: a public book of another user they subscribed to
 * - domain: the directory of their domain
 */
export type AddressBookKind =
  'default' | 'personal' | 'collected' | 'delegated' | 'subscribed' | 'domain'

/** What the UI lets the current user do with an address book. */
export interface AddressBookCapabilities {
  // false for the collected book and the default book, listed by My contacts
  listedInSidebar: boolean
  // create form, import, copy / move destination
  addContacts: boolean
  // edit or delete a contact of this book
  editContacts: boolean
  // move source, which removes the contact from this book
  moveContactsOut: boolean
  // the owner, or a delegated book with AddressBookAccessLevel.Editor
  share: boolean
  rename: boolean
  // own books, except the default and the collected ones
  delete: boolean
  // delegated and subscribed books
  removeFromList: boolean
}

export interface AddressBookDescription {
  kind: AddressBookKind
  capabilities: AddressBookCapabilities
}

const isOwnedByAnotherUser = (
  book: RawAddressBook,
  currentUserId: string | undefined
): boolean => book.ownerId !== undefined && book.ownerId !== currentUserId

/** For a route whose book is not loaded yet: is it the domain book? */
export const isDomainAddressBookId = (addressBookId: string): boolean =>
  addressBookId === DOMAIN_ADDRESS_BOOK_ID

export function getAddressBookKind(
  book: RawAddressBook,
  currentUserId: string | undefined
): AddressBookKind {
  if (isDomainAddressBookId(book.id)) return 'domain'
  if (isOwnedByAnotherUser(book, currentUserId)) {
    // a delegation carries the sharee's access, a subscription does not
    return book.shareAccess === undefined ? 'subscribed' : 'delegated'
  }
  if (book.id === DEFAULT_ADDRESS_BOOK_ID) return 'default'
  if (book.id === COLLECTED_ADDRESS_BOOK_ID) return 'collected'
  return 'personal'
}

const NO_CAPABILITIES: AddressBookCapabilities = {
  listedInSidebar: false,
  addContacts: false,
  editContacts: false,
  moveContactsOut: false,
  share: false,
  rename: false,
  delete: false,
  removeFromList: false
}

const contactCapabilities = (
  canWrite: boolean
): Pick<
  AddressBookCapabilities,
  'addContacts' | 'editContacts' | 'moveContactsOut'
> => ({
  addContacts: canWrite,
  editContacts: canWrite,
  moveContactsOut: canWrite
})

const ownCapabilities = (book: RawAddressBook): AddressBookCapabilities => ({
  ...NO_CAPABILITIES,
  ...contactCapabilities(book.canWrite),
  share: true,
  rename: book.canWrite
})

const sharedCapabilities = (book: RawAddressBook): AddressBookCapabilities => ({
  ...NO_CAPABILITIES,
  ...contactCapabilities(book.canWrite),
  listedInSidebar: true,
  removeFromList: true
})

const CAPABILITIES_BY_KIND: Record<
  AddressBookKind,
  (book: RawAddressBook) => AddressBookCapabilities
> = {
  default: ownCapabilities,
  personal: book => ({
    ...ownCapabilities(book),
    listedInSidebar: true,
    delete: true
  }),
  // the internal book is written by the server only
  collected: book => ({ ...ownCapabilities(book), addContacts: false }),
  delegated: book => ({
    ...sharedCapabilities(book),
    share: book.shareAccess === AddressBookAccessLevel.Editor
  }),
  subscribed: sharedCapabilities,
  // writable for the domain administrators, but not edited from this app
  domain: () => ({ ...NO_CAPABILITIES, listedInSidebar: true })
}

/** Classifies a book for the current user, and what they may do with it. */
export function describeAddressBook(
  book: RawAddressBook,
  currentUserId: string | undefined
): AddressBookDescription {
  const kind = getAddressBookKind(book, currentUserId)
  return { kind, capabilities: CAPABILITIES_BY_KIND[kind](book) }
}

/** The book with its kind and capabilities, as it enters the store. */
export const classifyAddressBook = <T extends RawAddressBook>(
  book: T,
  currentUserId: string | undefined
): T & AddressBookDescription => ({
  ...book,
  ...describeAddressBook(book, currentUserId)
})

/** Every book of a record, classified for the current user. */
export const classifyAddressBooks = <T extends RawAddressBook>(
  books: Record<string, T>,
  currentUserId?: string
): Record<string, T & AddressBookDescription> =>
  Object.fromEntries(
    Object.entries(books).map(([id, book]) => [
      id,
      classifyAddressBook(book, currentUserId)
    ])
  )

const SHARED_KINDS: AddressBookKind[] = ['delegated', 'subscribed']

/** Shared with the user by another user, delegated or subscribed. */
export const isSharedAddressBook = (book: { kind: AddressBookKind }): boolean =>
  SHARED_KINDS.includes(book.kind)

/** One of the user's own books, the domain book excluded. */
export const isOwnAddressBook = (book: { kind: AddressBookKind }): boolean =>
  !isSharedAddressBook(book) && book.kind !== 'domain'
