import {
  AddressBook,
  AddressBookWithContacts
} from '@common/features/Contacts/contactsTypes'
import { matchesScope } from '@common/features/Contacts/contactsSelectors'
import {
  isHiddenAddressBook,
  sortAddressBooks
} from '@common/features/Contacts/contactsUtils'

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
  const mayWriteCurrentBook = currentBook ? currentBook.canWrite : loading
  return addressBookId && addressBookId !== 'dab' && mayWriteCurrentBook
    ? `/contacts/${addressBookId}/new`
    : '/contacts/new'
}

export const categorizeAddressBooks = (
  addressBooks: Record<string, AddressBookWithContacts>,
  openpaasId: string | undefined,
  t: (key: string) => string
): SidebarBooks => {
  const allBooks = Object.values(addressBooks)
  const otherBooks = sortAddressBooks(
    allBooks.filter(
      (book: AddressBookWithContacts) =>
        !isHiddenAddressBook(book.id) && book.id !== 'dab'
    ) as AddressBook[],
    t
  )

  return {
    personalBooks: otherBooks.filter(book =>
      matchesScope(book, 'onlyMine', openpaasId)
    ),
    sharedBooks: otherBooks.filter(book =>
      matchesScope(book, 'shared', openpaasId)
    ),
    domainBooks: allBooks.filter(
      (book: AddressBookWithContacts) => book.id === 'dab'
    )
  }
}

// twake-mui NavLink only reflects `selected` visually: expose it to
// assistive technologies too
export const getAriaCurrent = (selected: boolean): 'page' | undefined =>
  selected ? 'page' : undefined
