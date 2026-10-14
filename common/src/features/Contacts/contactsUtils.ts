import { RejectedError } from '@common/utils/errorUtils'
import { DEFAULT_ADDRESS_BOOK_ID, HIDDEN_ADDRESS_BOOK_IDS } from './constants'
import { AddressBook, ContactAddress } from './contactsTypes'

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

/** Maps a rejected request to the i18n key of a user-friendly message. */
export function toContactsErrorKey(
  error: RejectedError | undefined,
  fallbackKey: string
): string {
  return error?.status === 403 ? 'contacts.errors.forbidden' : fallbackKey
}

export function getAddressBookDisplayName(
  book: AddressBook | undefined,
  t: (key: string) => string
): string {
  if (!book) return ''
  if (book.id === 'dab') return t('contacts.domainAddressBook')
  return book.name
}

const isDefaultAddressBook = (book: AddressBook): boolean =>
  book.id === DEFAULT_ADDRESS_BOOK_ID

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
