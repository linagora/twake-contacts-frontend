import { useCallback, useMemo } from 'react'
import { useAppSelector } from '@common/app/hooks'
import { searchContacts } from '../ContactsDao'
import { AddressBook, ContactEntry } from '../contactsTypes'

/**
 * Searches `search` across every address book of the store. Resolves to no
 * entry for a blank search or when no book is loaded. Result entries carry the
 * store's book id.
 */
export function useContactSearch(): (
  search: string
) => Promise<ContactEntry[]> {
  const addressBooksRecord = useAppSelector(
    state => state.contacts.addressBooks
  )
  const addressBooks = useMemo<AddressBook[]>(
    () => Object.values(addressBooksRecord),
    [addressBooksRecord]
  )

  return useCallback(
    async (search: string): Promise<ContactEntry[]> => {
      if (addressBooks.length === 0 || !search.trim()) return []
      return searchContacts(addressBooks, search)
    },
    [addressBooks]
  )
}
