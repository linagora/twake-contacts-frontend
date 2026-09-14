import { JCalProperty } from './davTypes'

export interface AddressBook {
  id: string
  userId: string
  name: string
  contactsCount: number
  acl: string[]
  canWrite: boolean
}

export interface ContactName {
  familyName: string
  givenName: string
}

export interface ContactAddress {
  type: string | null
  address: string
  street: string
  locality: string
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
}

export interface ContactsState {
  addressBooks: Record<string, AddressBookWithContacts>
  loading: boolean
  error: string | null
}

export interface ContactEntry {
  addressBookId: string
  contact: Contact
}
