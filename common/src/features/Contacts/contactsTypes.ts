import { JCalProperty } from './davTypes'
import { userData } from '../User/userDataTypes'

export interface AddressBook {
  id: string
  userId: string
  ownerId?: string
  name: string
  // null when the server does not report it, as for shared books
  contactsCount: number | null
  acl: string[]
  canWrite: boolean
  ownerDisplayName?: string
  invitedMembers?: userData[]
  syncToken?: number
}

export interface ContactName {
  familyName: string
  givenName: string
}

/** Components of a vCard ADR property (RFC 6350 §6.3.1). */
export interface ContactAddress {
  type: string | null
  poBox: string
  extended: string
  street: string
  locality: string
  region: string
  postalCode: string
  country: string
}

export interface ContactPhone {
  type: string | null
  value: string
}

export interface ContactEmail {
  type: string | null
  value: string
}

export interface ContactSocialProfile {
  type: string | null
  value: string
}

export interface ContactOrg {
  name: string
  units: string[]
}

export interface Contact {
  id: string
  displayName: string
  name?: ContactName
  nickname?: string
  birthday?: string
  emails: ContactEmail[]
  phones?: ContactPhone[]
  addresses?: ContactAddress[]
  socialProfiles?: ContactSocialProfile[]
  urls?: string[]
  org?: ContactOrg
  title?: string
  role?: string
  categories?: string[]
  note?: string
  passthroughProps?: JCalProperty[]
}

export interface AddressBookWithContacts extends AddressBook {
  // the contacts loaded so far, in no particular order: listings order them
  contacts: Contact[]
}

export interface ContactRef {
  addressBookId: string
  contactId: string
}

/** Where a loaded page starts: the cursor it was read after, its first ref. */
export interface ContactListingPage {
  after: string | null
  refIndex: number
}

/** A sorted list of contacts, read page after page with the server cursor. */
export interface ContactListing {
  refs: ContactRef[]
  pages: ContactListingPage[]
  // cursor of the next page, null before the first page and after the last one
  next: string | null
  hasMore: boolean
  // the page in flight, whose result is the only one the listing takes
  loadingRequestId: string | null
  // restarted from its first page after the server rejected its cursor
  restarted?: boolean
}

export interface ContactsState {
  addressBooks: Record<string, AddressBookWithContacts>
  // keyed by ALL_CONTACTS_LISTING or by address book id
  listings: Record<string, ContactListing>
  loading: boolean
  detailsLoading?: boolean
  error: string | null
}

export interface ContactEntry {
  addressBookId: string
  contact: Contact
}
