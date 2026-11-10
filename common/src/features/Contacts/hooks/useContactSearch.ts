import { useCallback, useMemo } from 'react'
import { useAppSelector } from '@common/app/hooks'
import { fromServerBookId, toServerBookId } from '@common/api/davPaths'
import { AddressBookRef, searchContacts } from '../ContactsDao'
import { ContactEntry } from '../contactsTypes'

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
        addressBookId: toServerBookId(book.id)
      })),
    [addressBooks]
  )

  return useCallback(
    async (search: string): Promise<ContactEntry[]> => {
      if (addressBookRefs.length === 0 || !search.trim()) return []
      const entries = await searchContacts(addressBookRefs, search)
      return entries.map(entry => ({
        ...entry,
        addressBookId: fromServerBookId(entry.addressBookId)
      }))
    },
    [addressBookRefs]
  )
}
