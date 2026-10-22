import { ContactSort } from './contactsTypes'

export const SEARCH_LIMIT = 30
export const CONTACTS_PAGINATION_LIMIT = 50
export const DEFAULT_ADDRESS_BOOK_ID = 'contacts'
// listing of the contacts of every address book, shown by My contacts
export const ALL_CONTACTS_LISTING = 'all'
export const DEFAULT_CONTACT_SORT: ContactSort = { by: 'fn', order: 'asc' }
// internal book of the addresses collected from the sent emails
export const COLLECTED_ADDRESS_BOOK_ID = 'collected'
export const HIDDEN_ADDRESS_BOOK_IDS = [
  DEFAULT_ADDRESS_BOOK_ID,
  COLLECTED_ADDRESS_BOOK_ID
]
// `dav:share-access` values granting the sharee no write right (sabre/dav ACCESS_READ, ACCESS_NOACCESS)
export const READ_ONLY_SHARE_ACCESSES = [2, 4]
