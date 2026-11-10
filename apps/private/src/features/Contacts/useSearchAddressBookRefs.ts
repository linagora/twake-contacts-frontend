import { useAppSelector } from '@common/app/hooks'
import { AddressBookRef } from '@common/features/Contacts/ContactsDao'
import { useMemo } from 'react'

// The domain book is stored as dab, while its contacts are searched in domain-members
export const useSearchAddressBookRefs = (): AddressBookRef[] => {
  const addressBooksRecord = useAppSelector(
    state => state.contacts.addressBooks
  )
  return useMemo(
    () =>
      Object.values(addressBooksRecord).map(book => ({
        userId: book.userId,
        addressBookId: book.id === 'dab' ? 'domain-members' : book.id
      })),
    [addressBooksRecord]
  )
}
