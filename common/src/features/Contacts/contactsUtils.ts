import { RejectedError } from '@common/utils/errorUtils'
import { DEFAULT_ADDRESS_BOOK_ID, HIDDEN_ADDRESS_BOOK_IDS } from './constants'
import { AddressBook, ContactAddress } from './contactsTypes'
import { AddressBookAccessLevel } from './davTypes'

/** Joins the address components in postal order, e.g. "10 Avenue des Champs, 75008 Paris, France". */
export function formatAddress(address: ContactAddress): string {
  return [
    address.poBox,
    address.extended,
    address.street,
    [address.postalCode, address.locality].filter(Boolean).join(' '),
    address.region,
    address.country
  ]
    .filter(Boolean)
    .join(', ')
}

export function isHiddenAddressBook(id: string): boolean {
  return HIDDEN_ADDRESS_BOOK_IDS.includes(id)
}

// only the owner and the sharees with administration rights manage the
// sharing: not the subscribers of a public book nor read-write sharees
export function canShareAddressBook(book: AddressBook): boolean {
  if (book.id === 'dab') return false
  return (
    book.ownerId === undefined ||
    book.shareAccess === AddressBookAccessLevel.Editor
  )
}

/** Maps a rejected request to the i18n key of a user-friendly message. */
export function toContactsErrorKey(
  error: RejectedError | undefined,
  fallbackKey: string
): string {
  return error?.status === 403 ? 'contacts.errors.forbidden' : fallbackKey
}

const isDefaultAddressBook = (book: AddressBook): boolean =>
  book.id === DEFAULT_ADDRESS_BOOK_ID

export function getAddressBookDisplayName(
  book: AddressBook | undefined,
  t: (key: string) => string
): string {
  if (!book) return ''
  if (book.id === 'dab') return t('contacts.domainAddressBook')
  if (book.name) return book.name
  // a shared book's own id is the generated id of the sharee's copy
  return book.isDefault || isDefaultAddressBook(book)
    ? t('contacts.myContacts')
    : (book.sourceBookId ?? book.id)
}

// default address book first, then by display name in natural order
export function sortAddressBooks<T extends AddressBook>(
  books: T[],
  t: (key: string) => string
): T[] {
  return [...books].sort(
    (a, b) =>
      Number(isDefaultAddressBook(b)) - Number(isDefaultAddressBook(a)) ||
      getAddressBookDisplayName(a, t).localeCompare(
        getAddressBookDisplayName(b, t),
        undefined,
        { numeric: true }
      )
  )
}
