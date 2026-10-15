import {
  AddressBookWithContacts,
  Contact,
  ContactEntry,
  ContactListing,
  ContactRef,
  ContactsState
} from './contactsTypes'

export function makeContactLookup(
  books: Record<string, AddressBookWithContacts>
): (ref: ContactRef) => Contact | undefined {
  const contactsByBook = new Map<string, Map<string, Contact>>()
  return ({ addressBookId, contactId }) => {
    let contacts = contactsByBook.get(addressBookId)
    if (!contacts) {
      contacts = new Map(
        (books[addressBookId]?.contacts ?? []).map(contact => [
          contact.id,
          contact
        ])
      )
      contactsByBook.set(addressBookId, contacts)
    }
    return contacts.get(contactId)
  }
}

export function isSameContactRef(a: ContactRef, b: ContactRef): boolean {
  return a.addressBookId === b.addressBookId && a.contactId === b.contactId
}

/**
 * Stores the contacts of a page read after the cursor after, and lists them
 * at the end of the listing. A contact listed already keeps its place, as one
 * renamed between two pages: the table needs unique keys, and the pages
 * before keep their start.
 */
export function appendListingPage(
  state: ContactsState,
  listing: ContactListing,
  after: string | null,
  entries: ContactEntry[]
): void {
  const refs = entries.flatMap(({ addressBookId, contact }) => {
    const book = state.addressBooks[addressBookId]
    if (!book) return []
    const index = book.contacts.findIndex(c => c.id === contact.id)
    if (index === -1) book.contacts.push(contact)
    else book.contacts[index] = contact
    return [{ addressBookId, contactId: contact.id }]
  })
  listing.pages.push({ after, refIndex: listing.refs.length })
  listing.refs.push(
    ...refs.filter(ref => !listing.refs.some(r => isSameContactRef(r, ref)))
  )
}
