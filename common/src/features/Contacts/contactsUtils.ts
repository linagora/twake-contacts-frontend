import { HIDDEN_ADDRESS_BOOK_IDS } from './constants'
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
