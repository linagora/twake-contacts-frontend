import { JCalProperty } from './davTypes'
import { userData } from '../User/userDataTypes'

export interface AddressBook {
  id: string
  userId: string
  name: string
  // null when the server does not report it, as for shared books
  contactsCount: number | null
  acl: string[]
  canWrite: boolean
  ownerDisplayName?: string
  invitedMembers?: userData[]
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
  contacts: Contact[]
  offset: number
  hasMore: boolean
  isLoadingMore?: boolean
  invitedMembers?: userData[]
}

export interface ContactsState {
  addressBooks: Record<string, AddressBookWithContacts>
  loading: boolean
  detailsLoading?: boolean
  error: string | null
}

export interface ContactEntry {
  addressBookId: string
  contact: Contact
}
