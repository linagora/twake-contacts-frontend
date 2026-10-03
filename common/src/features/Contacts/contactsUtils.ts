import { DEFAULT_ADDRESS_BOOK_ID, HIDDEN_ADDRESS_BOOK_IDS } from './constants'
import { AddressBook } from './contactsTypes'

export function isHiddenAddressBook(id: string): boolean {
  return HIDDEN_ADDRESS_BOOK_IDS.includes(id)
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
