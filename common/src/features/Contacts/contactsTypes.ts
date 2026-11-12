import { JCalParams, JCalProperty, JCalValue } from './davTypes'
import { userData } from '../User/userDataTypes'
import { AddressBookCapabilities, AddressBookKind } from './addressBookModel'

/** An address book as read from the server, before it is classified. */
export interface RawAddressBook {
  id: string
  userId: string
  ownerId?: string
  sourceBookId?: string
  name: string
  // the owner's default book, its name is empty on the server
  isDefault?: boolean
  // null when the server does not report it, as for shared books
  contactsCount: number | null
  acl: string[]
  canWrite: boolean
  // dav:share-access of a delegated book, the sharee's rights on it
  shareAccess?: number
  ownerDisplayName?: string
  invitedMembers?: userData[]
  syncToken?: number
  isPublic?: boolean
}

/** A book shown by its name: one of the user's, or a book they may subscribe to. */
export type DisplayedAddressBook = RawAddressBook & { kind?: AddressBookKind }

/** An address book classified for the current user by describeAddressBook. */
export interface AddressBook extends RawAddressBook {
  kind: AddressBookKind
  capabilities: AddressBookCapabilities
}

export interface ContactName {
  familyName: string
  givenName: string
  /** Components as read, kept only when one holds several values (RFC 6350 §3.3), to write it back unchanged. */
  components?: JCalValue[]
}

/**
 * Parameters of a property as read (RFC 6350 §5: PREF, the TYPE list, LABEL,
 * LANGUAGE, ALTID, X- parameters…, and the group sabre/vobject carries as the
 * `group` parameter), written back on save so that other clients keep them.
 */
export interface WithParams {
  params?: JCalParams
}

/** The properties a contact holds at most once, whose parameters are kept by name. */
export type SingleContactProperty =
  'fn' | 'n' | 'nickname' | 'categories' | 'org' | 'title' | 'role' | 'note'

/** Components of a vCard ADR property (RFC 6350 §6.3.1). */
export interface ContactAddress extends WithParams {
  type: string | null
  poBox: string
  extended: string
  street: string
  locality: string
  region: string
  postalCode: string
  country: string
  /** Components after the seventh (e.g. RFC 9554 additions), kept for display and round-trip. */
  extra?: string[]
  /** Components as read, kept only when one holds several values (RFC 6350 §3.3), to write it back unchanged. */
  components?: JCalValue[]
}

/** vCard 4 TEL value type (RFC 6350 6.4.1): a `tel:` URI or a free text number. */
export type PhoneValueType = 'uri' | 'text'
/** TEL value as stored on the server, kept so an unchanged phone is saved back as is. */
export interface ContactPhoneSource {
  valueType: string
  value: string
}

export interface ContactPhone extends WithParams {
  type: string | null
  /** Number without the `tel:` scheme. */
  value: string
  // only set when the stored value differs from the readable one, e.g. a tel: URI
  source?: ContactPhoneSource
}

export interface ContactEmail extends WithParams {
  type: string | null
  value: string
}

export interface ContactSocialProfile extends WithParams {
  type: string | null
  value: string
}

export interface ContactUrl extends WithParams {
  value: string
}

export interface ContactOrg {
  name: string
  units: string[]
  /** Components as read, kept only when one holds several values (RFC 6350 §3.3), to write it back unchanged. */
  components?: JCalValue[]
}

export interface Contact {
  id: string
  displayName: string
  name?: ContactName
  nicknames?: string[]
  birthday?: string
  // BDAY as read, kept to write back its value type and parameters unchanged
  birthdayProp?: JCalProperty
  emails: ContactEmail[]
  phones?: ContactPhone[]
  addresses?: ContactAddress[]
  socialProfiles?: ContactSocialProfile[]
  urls?: ContactUrl[]
  org?: ContactOrg
  title?: string
  role?: string
  categories?: string[]
  note?: string
  /** The card's own UID property, written back as read: it may differ from the file name `id`. */
  uidProperty?: JCalProperty
  /** Parameters of the single properties (FN, N, ORG…) as read, written back on save. */
  propertyParams?: Partial<Record<SingleContactProperty, JCalParams>>
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
  // its last page failed: no page loads until the failure is cleared
  failed?: boolean
}

/** The order the server sorts the pages of every listing in. */
export interface ContactSort {
  by: 'fn' | 'email'
  order: 'asc' | 'desc'
}

/** What a copy or move produced: the contact as it is in its new book. */
export interface ContactTransferSuccess {
  operation: 'copy' | 'move'
  requestId: string
  contactId: string
  contactName: string
  destinationId: string
}

export interface ContactsState {
  transferSuccess?: ContactTransferSuccess | null
  addressBookSuccess?: {
    operation: 'update' | 'delete' | 'remove'
    requestId: string
  } | null
  addressBooks: Record<string, AddressBookWithContacts>
  // keyed by ALL_CONTACTS_LISTING or by address book id
  listings: Record<string, ContactListing>
  sort: ContactSort
  loading: boolean
  detailsLoading?: boolean
  detailRequestIds?: Record<string, string>
  error: string | null
}

export interface ContactEntry {
  addressBookId: string
  contact: Contact
}

export interface UserResult {
  id: string
  displayName: string
  emails: { value: string }[]
}
