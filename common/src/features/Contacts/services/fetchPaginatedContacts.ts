import { fetchContactsForBook } from '../ContactsDao'
import { AddressBook, Contact } from '../contactsTypes'

export async function fetchPaginatedContacts(
  book: AddressBook,
  userId: string,
  limit: number,
  offset: number
): Promise<{
  contacts: Contact[]
  offset: number
  hasMore: boolean
  syncToken: number
}> {
  const { contacts, hasMore, syncToken } = await fetchContactsForBook(
    book,
    userId,
    limit,
    offset
  )
  const validContacts = contacts?.length > 0 ? contacts : []

  return {
    contacts: validContacts,
    offset: offset + validContacts.length,
    hasMore,
    syncToken
  }
}
