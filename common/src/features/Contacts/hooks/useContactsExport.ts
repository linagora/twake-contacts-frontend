import { exportAddressBook, exportContact } from '../ContactsDao'
import { AddressBook } from '../contactsTypes'

export interface ContactsExport {
  /** Every contact of the book as a single vCard file. */
  exportAddressBook: (book: AddressBook) => Promise<Blob>
  /** One contact of the book as a vCard file. */
  exportContact: (book: AddressBook, contactId: string) => Promise<Blob>
}

const contactsExport: ContactsExport = { exportAddressBook, exportContact }

/** Downloads address books and contacts as vCard files. */
export function useContactsExport(): ContactsExport {
  return contactsExport
}
