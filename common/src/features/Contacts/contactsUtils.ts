import { HIDDEN_ADDRESS_BOOK_IDS } from './constants'
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

export function getAddressBookDisplayName(
  book: AddressBook | undefined,
  t: (key: string) => string
): string {
  if (!book) return ''
  if (book.id === 'dab') return t('contacts.domainAddressBook')
  return book.name
}
