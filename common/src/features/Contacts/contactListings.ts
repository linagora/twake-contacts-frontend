import { ALL_CONTACTS_LISTING } from './constants'
import {
  AddressBookWithContacts,
  Contact,
  ContactEntry,
  ContactListing,
  ContactRef,
  ContactSort,
  ContactsState
} from './contactsTypes'

// Same order as the server: English, ignoring case and accents
const collator = new Intl.Collator('en', { sensitivity: 'base' })

// The server sorts by the preferred email, which it lists first, a contact
// without email coming first
function getSortKey(contact: Contact, by: ContactSort['by']): string {
  return (
    by === 'fn' ? contact.displayName : (contact.emails[0]?.value ?? '')
  ).trim()
}

function compareContacts(
  a: Contact,
  b: Contact,
  { by, order }: ContactSort
): number {
  const result = collator.compare(getSortKey(a, by), getSortKey(b, by))
  return order === 'asc' ? result : -result
}

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

function isListingOfBook(listingKey: string, addressBookId: string): boolean {
  return listingKey === ALL_CONTACTS_LISTING || listingKey === addressBookId
}

// The pages starting from the ref at fromIndex move by delta refs, the
// first page staying at 0: a ref inserted before the first one of a page
// ends the page before
function shiftPages(
  listing: ContactListing,
  fromIndex: number,
  delta: number
): void {
  for (const page of listing.pages) {
    if (page.refIndex >= fromIndex && page.refIndex > 0) page.refIndex += delta
  }
}

// A contact sorted after the last loaded one is left to the next pages,
// unless it was loaded already: the server does not send again what is
// before its cursor
function insertContactRef(
  listing: ContactListing,
  ref: ContactRef,
  isBefore: (listed: ContactRef) => boolean,
  wasListed: boolean
): void {
  const index = listing.refs.findIndex(isBefore)
  if (index !== -1) {
    listing.refs.splice(index, 0, ref)
    shiftPages(listing, index, 1)
  } else if (!listing.hasMore || wasListed) {
    listing.refs.push(ref)
  }
}

/**
 * Moves the contact of ref, already stored in its book, from previousRef to
 * its sorted place in the listings showing that book, or only removes
 * previousRef when the book no longer has it.
 */
export function placeContactInListings(
  state: ContactsState,
  ref: ContactRef,
  previousRef: ContactRef = ref
): void {
  const findContact = makeContactLookup(state.addressBooks)
  const contact = findContact(ref)
  // whether the contact goes before a listed one, in the order of the server
  const isBefore = (listed: ContactRef): boolean => {
    const other = findContact(listed)
    return (
      contact !== undefined &&
      other !== undefined &&
      compareContacts(contact, other, state.sort) < 0
    )
  }

  for (const [key, listing] of Object.entries(state.listings)) {
    const index = listing.refs.findIndex(r => isSameContactRef(r, previousRef))
    if (index !== -1) {
      listing.refs.splice(index, 1)
      shiftPages(listing, index + 1, -1)
    }
    if (contact && isListingOfBook(key, ref.addressBookId)) {
      insertContactRef(listing, ref, isBefore, index !== -1)
    }
  }
}
