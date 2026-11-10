import { useCallback, useMemo } from 'react'
import { useAppSelector } from '@common/app/hooks'
import { AddressBookRef, searchContacts } from '../ContactsDao'
import { ContactEntry } from '../contactsTypes'

// the domain book is 'dab' in the store and 'domain-members' for the search API
const DOMAIN_ADDRESS_BOOK_ID = 'dab'
const DOMAIN_MEMBERS_BOOK_ID = 'domain-members'

/** Maps a search result's book id back to the id used by the store. */
const toStoreAddressBookId = (addressBookId: string): string =>
  addressBookId === DOMAIN_MEMBERS_BOOK_ID
    ? DOMAIN_ADDRESS_BOOK_ID
    : addressBookId

/**
 * Searches `search` across every address book of the store. Resolves to no
 * entry for a blank search or when no book is loaded. Result entries carry the
 * store's book id.
 */
export function useContactSearch(): (
  search: string
) => Promise<ContactEntry[]> {
  const addressBooks = useAppSelector(state => state.contacts.addressBooks)

  const addressBookRefs = useMemo<AddressBookRef[]>(
    () =>
      Object.values(addressBooks).map(book => ({
        userId: book.userId,
        addressBookId:
          book.id === DOMAIN_ADDRESS_BOOK_ID ? DOMAIN_MEMBERS_BOOK_ID : book.id
      })),
    [addressBooks]
  )

  return useCallback(
    async (search: string): Promise<ContactEntry[]> => {
      if (addressBookRefs.length === 0 || !search.trim()) return []
      const entries = await searchContacts(addressBookRefs, search)
      return entries.map(entry => ({
        ...entry,
        addressBookId: toStoreAddressBookId(entry.addressBookId)
      }))
    },
    [addressBookRefs]
  )
}
