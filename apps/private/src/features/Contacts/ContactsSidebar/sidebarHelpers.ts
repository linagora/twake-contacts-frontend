import {
  AddressBook,
  AddressBookWithContacts
} from '@common/features/Contacts/contactsTypes'
import {
  isDomainAddressBookId,
  isOwnAddressBook,
  isSharedAddressBook
} from '@common/features/Contacts/addressBookModel'
import { sortAddressBooks } from '@common/features/Contacts/contactsUtils'

export interface SidebarBooks {
  personalBooks: AddressBook[]
  sharedBooks: AddressBook[]
  domainBooks: AddressBook[]
}

export const getCreateContactLink = (
  addressBookId?: string,
  currentBook?: AddressBookWithContacts,
  loading = false
): string => {
  // While the books are loading, keep the book of the URL: the create page
  // waits for the books and falls back to the default one if not writable
  const mayAddToCurrentBook = currentBook
    ? currentBook.capabilities.addContacts
    : loading && !!addressBookId && !isDomainAddressBookId(addressBookId)
  return addressBookId && mayAddToCurrentBook
    ? `/contacts/${addressBookId}/new`
    : '/contacts/new'
}

export const categorizeAddressBooks = (
  addressBooks: Record<string, AddressBookWithContacts>,
  t: (key: string) => string
): SidebarBooks => {
  const listedBooks = sortAddressBooks(
    Object.values(addressBooks).filter(
      book => book.capabilities.listedInSidebar
    ),
    t
  )

  return {
    personalBooks: listedBooks.filter(isOwnAddressBook),
    sharedBooks: listedBooks.filter(isSharedAddressBook),
    domainBooks: listedBooks.filter(book => book.kind === 'domain')
  }
}

// twake-mui NavLink only reflects `selected` visually: expose it to
// assistive technologies too
export const getAriaCurrent = (selected: boolean): 'page' | undefined =>
  selected ? 'page' : undefined
