import { RejectedError } from '@common/utils/errorUtils'
import { DEFAULT_ADDRESS_BOOK_ID, HIDDEN_ADDRESS_BOOK_IDS } from './constants'
import {
  AddressBook,
  ContactAddress,
  DisplayedAddressBook
} from './contactsTypes'

// trims the parts and drops the blank ones, so that a whitespace-only
// component leaves no stray separator behind
function joinNonBlank(parts: string[], separator: string): string {
  return parts
    .map(part => part.trim())
    .filter(Boolean)
    .join(separator)
}

/** Joins the address components in postal order, e.g. "10 Avenue des Champs, 75008 Paris, France". */
export function formatAddress(address: ContactAddress): string {
  return joinNonBlank(
    [
      address.poBox,
      address.extended,
      address.street,
      joinNonBlank([address.postalCode, address.locality], ' '),
      address.region,
      address.country,
      ...(address.extra ?? [])
    ],
    ', '
  )
}

export function isHiddenAddressBook(id: string): boolean {
  return HIDDEN_ADDRESS_BOOK_IDS.includes(id)
}

// the books contacts are written to from the UI (create form, copy and move
// destinations), as decided by describeAddressBook
export function isWritableTargetBook(book: AddressBook | undefined): boolean {
  return !!book?.capabilities.addContacts
}

export function isContactTransferDestination(
  book: AddressBook | undefined,
  sourceId: string
): boolean {
  return isWritableTargetBook(book) && book?.id !== sourceId
}

/** Maps a rejected request to the i18n key of a user-friendly message. */
export function toContactsErrorKey(
  error: RejectedError | undefined,
  fallbackKey: string
): string {
  return error?.status === 403 ? 'contacts.errors.forbidden' : fallbackKey
}

const isDefaultAddressBook = (book: DisplayedAddressBook): boolean =>
  book.id === DEFAULT_ADDRESS_BOOK_ID

export function getAddressBookDisplayName(
  book: DisplayedAddressBook | undefined,
  t: (key: string) => string
): string {
  if (!book) return ''
  if (book.kind === 'domain') return t('contacts.domainAddressBook')
  if (book.name?.trim()) return book.name
  // a shared book's own id is the generated id of the sharee's copy
  const fallbackId = book.sourceBookId || book.id
  return book.isDefault || isDefaultAddressBook(book) || !fallbackId
    ? t('contacts.myContacts')
    : fallbackId
}

// default address book first, then by display name in natural order
export function sortAddressBooks<T extends DisplayedAddressBook>(
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
