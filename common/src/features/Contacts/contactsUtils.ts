import { RejectedError } from '@common/utils/errorUtils'
import { HIDDEN_ADDRESS_BOOK_IDS } from './constants'
import { AddressBook } from './contactsTypes'

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
