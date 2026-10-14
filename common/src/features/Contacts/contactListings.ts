import { ALL_CONTACTS_LISTING } from './constants'
import {
  AddressBookWithContacts,
  Contact,
  ContactListing,
  ContactRef,
  ContactsState
} from './contactsTypes'

// Same order as the server: English, ignoring case and accents
const collator = new Intl.Collator('en', { sensitivity: 'base' })

export function compareContacts(a: Contact, b: Contact): number {
  return collator.compare(a.displayName.trim(), b.displayName.trim())
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

function isListingOfBook(listingKey: string, addressBookId: string): boolean {
  return listingKey === ALL_CONTACTS_LISTING || listingKey === addressBookId
}

// A contact sorted after the last loaded one is left to the next pages,
// unless it was loaded already: the server does not send again what is
// before its cursor
function insertContactRef(
  listing: ContactListing,
  ref: ContactRef,
  findContact: (ref: ContactRef) => Contact | undefined,
  wasListed: boolean
): void {
  const contact = findContact(ref)
  if (!contact) return
  const index = listing.refs.findIndex(r => {
    const other = findContact(r)
    return other !== undefined && compareContacts(contact, other) < 0
  })
  if (index !== -1) {
    listing.refs.splice(index, 0, ref)
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

  for (const [key, listing] of Object.entries(state.listings)) {
    const wasListed = listing.refs.some(r => isSameContactRef(r, previousRef))
    listing.refs = listing.refs.filter(r => !isSameContactRef(r, previousRef))
    if (isListingOfBook(key, ref.addressBookId)) {
      insertContactRef(listing, ref, findContact, wasListed)
    }
  }
}
