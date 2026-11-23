import { config } from '@common/config'
import { api } from '@common/utils/apiUtils'
import type { Options } from 'ky'
import { stripMailto } from '@common/utils/normalizeIdentity'
import {
  bookJsonHref,
  bookJsonPath,
  cardHref,
  cardPath,
  DavBookRef,
  fromServerBookId,
  toServerBookId,
  userBooksPath,
  userContactsPath
} from '@common/api/davPaths'
import { fetchUserById } from '@common/features/User/UserDao'
import { DomainInfo } from '@common/features/User/userDataTypes'
import {
  AddressBook,
  Contact,
  ContactEntry,
  ContactSort,
  RawAddressBook,
  UserResult
} from './contactsTypes'
import { classifyAddressBook } from './addressBookModel'
import {
  AddressBookAccessLevel,
  DavAddressBookItem,
  DavAddressBooksResponse,
  DavContactItem,
  DavContactsResponse,
  JCalCard,
  DavInvite
} from './davTypes'
import {
  decodeDavSegment,
  denormalizeContact,
  normalizeAddressBook,
  normalizeContact,
  normalizeContactsCount,
  readAddressBookSource,
  readHref
} from './transformer/ContactsTransformer'
import {
  CONTACTS_PAGINATION_LIMIT,
  DOMAIN_ADDRESS_BOOK_ID,
  SEARCH_LIMIT
} from './constants'
import { ToUserData } from '../User/type/OpenPaasUserData'
import { userData } from '../User/userDataTypes'

const CONTACTS_NS = config.CONTACTS_NS

export type UserId = string
export type AddressBookId = string
export type ContactId = string
export type ContactEtag = string
export type AddressBookName = string
export type SearchQuery = string
export type ImportFileId = string
export type ImportTarget = string
export type IncludeDomainMembers = boolean
export type PublishBookFlag = boolean

export interface ContactsPageQuery {
  after: string | null
  sort: ContactSort
  cache?: RequestCache
}

export interface ContactsPageResult {
  entries: ContactEntry[]
  next: string | null
}

export interface MergedContactSnapshot {
  contact: Contact
  etag: ContactEtag
}

export interface AddressBookDetailsResult {
  members: userData[]
  isPublic: boolean
}

export interface AddressBookNameUpdate {
  name: AddressBookName
}

interface CardRequestTarget {
  path: string
  contactId: ContactId
}

interface ContactsPageTarget {
  url: string
  searchParams: Record<string, string>
}

async function fetchAddressBookItems(
  userId: UserId
): Promise<DavAddressBookItem[]> {
  const response = api.get(userBooksPath(userId), {
    searchParams: {
      contactsCount: 'true',
      inviteStatus: '2',
      personal: 'true',
      shared: 'true',
      subscribed: 'true'
    }
  })
  const data: DavAddressBooksResponse = await response.json()

  // an item without href can neither be opened nor written to
  return (data._embedded?.['dav:addressbook'] ?? []).filter(
    book => normalizeAddressBook(book).id !== ''
  )
}

export async function fetchAddressBooks(
  userId: UserId,
  domains?: DomainInfo[]
): Promise<AddressBook[]> {
  const books = await fetchAddressBookItems(userId)
  const userBooks = await Promise.all(
    books.map(rawBook => enrichAddressBookOwner(rawBook, userId))
  )

  if (domains && domains.length > 0) {
    const domainBooks = await fetchDomainAddressBooks(domains, userId)
    return [...userBooks, ...domainBooks]
  }

  return userBooks
}

function parseSourceBookRef(
  rawBook: DavAddressBookItem,
  userId: UserId
): DavBookRef | null {
  const source = readAddressBookSource(rawBook)
  if (!source) return null

  // e.g. /addressbooks/6498ffa1d48f620025cc9dc2/431ae469-dfee-4b0a-a976-e04a12661b34.json
  const parts = source.split('/')
  if (parts.length < 3) return null

  const ownerId = decodeDavSegment(parts[2] ?? '')
  if (!ownerId || ownerId === userId) return null

  const rawBookSegment = parts[3] ?? ''
  const bookId = decodeDavSegment(rawBookSegment.replace('.json', ''))
  return { userId: ownerId, bookId }
}

async function applyOwnerMetadata(
  book: RawAddressBook,
  sourceRef: DavBookRef
): Promise<void> {
  book.ownerId = sourceRef.userId
  book.sourceBookId = sourceRef.bookId

  const [name, sourceContactsCount] = await Promise.all([
    fetchOwnerDisplayName(sourceRef.userId),
    book.contactsCount == null ? fetchSourceContactsCount(sourceRef) : undefined
  ])
  if (name) {
    book.ownerDisplayName = name
  }
  if (sourceContactsCount != null) {
    book.contactsCount = sourceContactsCount
  }
}

/** Resolves decoded source IDs and the owner's display name before classifying a book. */
async function enrichAddressBookOwner(
  rawBook: DavAddressBookItem,
  userId: UserId
): Promise<AddressBook> {
  const book = normalizeAddressBook(rawBook)
  const sourceRef = parseSourceBookRef(rawBook, userId)
  if (sourceRef) {
    await applyOwnerMetadata(book, sourceRef)
  }
  return classifyAddressBook(book, userId)
}

/**
 * esn-sabre gives no count for a subscription to a public book
 * (numberOfContacts is null): it is read from its source book, readable as it
 * is public. Never rejects: a count that cannot be read stays unknown.
 */
async function fetchSourceContactsCount(
  source: DavBookRef
): Promise<number | null> {
  try {
    const sourceBook = await propfindAddressBook(source, [
      `{${CONTACTS_NS}}numberOfContacts`
    ])
    return normalizeContactsCount(
      sourceBook[`{${CONTACTS_NS}}numberOfContacts`]
    )
  } catch {
    console.warn(`Failed to fetch the contacts count of ${source.bookId}`)
    return null
  }
}

// The owner of a shared or subscribed book is named from the profile, so that
// the label stays the same however the book entered the list
async function fetchOwnerDisplayName(
  ownerId: UserId
): Promise<string | undefined> {
  try {
    const user = await fetchUserById(ownerId)
    const name = [user.firstname, user.lastname].filter(Boolean).join(' ')
    return name || undefined
  } catch {
    console.warn(`Failed to fetch owner ${ownerId}`)
    return undefined
  }
}

async function fetchDomainAddressBooks(
  domains: DomainInfo[],
  userId: UserId
): Promise<AddressBook[]> {
  const domainBooks: AddressBook[] = []

  await Promise.all(
    domains.map(async domain => {
      try {
        const response = api(
          bookJsonPath({
            userId: domain.domainId,
            bookId: DOMAIN_ADDRESS_BOOK_ID
          }),
          {
            method: 'PROPFIND',
            json: {
              properties: [
                '{DAV:}displayname',
                '{urn:ietf:params:xml:ns:carddav}addressbook-description',
                '{DAV:}acl',
                '{DAV:}invite',
                '{DAV:}share-access',
                '{DAV:}group',
                `{${CONTACTS_NS}}subscription-type`,
                `{${CONTACTS_NS}}source`,
                `{${CONTACTS_NS}}type`,
                `{${CONTACTS_NS}}state`,
                `{${CONTACTS_NS}}numberOfContacts`,
                'acl'
              ]
            }
          }
        )
        const data: DavAddressBookItem = await response.json()
        domainBooks.push(normalizeDomainAddressBook(data, domain, userId))
      } catch {
        console.warn(
          `Failed to fetch domain addressbook for domain ${domain.domainId}:`
        )
      }
    })
  )

  return domainBooks
}

function normalizeDomainAddressBook(
  raw: DavAddressBookItem,
  domain: DomainInfo,
  userId: UserId
): AddressBook {
  const acl = raw['{DAV:}acl'] ?? []
  return classifyAddressBook(
    {
      id: DOMAIN_ADDRESS_BOOK_ID,
      userId: domain.domainId,
      name: raw['{DAV:}displayname'] ?? '',
      contactsCount: normalizeContactsCount(
        raw[`{${CONTACTS_NS}}numberOfContacts`]
      ),
      acl,
      canWrite: acl.some(p => p === '{DAV:}write-content' || p === '{DAV:}bind')
    },
    userId
  )
}

function getContactsPageUrl(
  userId: UserId,
  book: AddressBook | null,
  withDomainMembers: IncludeDomainMembers
): ContactsPageTarget {
  if (!book) {
    return {
      url: userContactsPath(userId),
      searchParams: { domainMember: String(withDomainMembers) }
    }
  }
  return {
    url: bookJsonPath(toServerBookRef(book)),
    searchParams: book.id === DOMAIN_ADDRESS_BOOK_ID ? { userId } : {}
  }
}

function buildContactsPageSearchParams(
  baseParams: Record<string, string>,
  { after, sort }: ContactsPageQuery
): Record<string, string> {
  return {
    ...baseParams,
    sort: sort.by,
    order: sort.order,
    limit: String(CONTACTS_PAGINATION_LIMIT),
    ...(after ? { after } : {})
  }
}

function readContactsPageEntries(
  data: DavContactsResponse,
  book: AddressBook | null
): ContactEntry[] {
  const items = data._embedded?.['dav:item'] ?? []
  return items.flatMap(item =>
    readContactEntry(
      item,
      book?.id ?? toStoreAddressBookId(item?._links?.self?.href)
    )
  )
}

/**
 * One page of the contacts of a book, or of every book of the user when book
 * is null, in the sort order. after is the next cursor of the previous page,
 * read in the same order, withDomainMembers adds the domain members to the
 * contacts of every book.
 */
export async function fetchContactsPage(
  userId: UserId,
  book: AddressBook | null,
  query: ContactsPageQuery,
  withDomainMembers: IncludeDomainMembers
): Promise<ContactsPageResult> {
  const { url, searchParams } = getContactsPageUrl(
    userId,
    book,
    withDomainMembers
  )
  const requestOptions: Options = {
    searchParams: buildContactsPageSearchParams(searchParams, query),
    ...(query.cache ? { cache: query.cache } : {})
  }
  const data: DavContactsResponse = await api.get(url, requestOptions).json()

  return {
    entries: readContactsPageEntries(data, book),
    next: data.next ?? null
  }
}

/**
 * The entry of a card of a listing or a search, or none when the card cannot
 * be read: one unreadable card must not keep the others of its page hidden.
 */
function readContactEntry(
  item: DavContactItem,
  addressBookId: AddressBookId
): ContactEntry[] {
  try {
    const contact = normalizeContact(item)
    // no id, no request can address the card (a card named "." or ".."): it
    // is not listed, rather than offering actions that cannot work
    if (contact.id === '') return []
    return [{ addressBookId, contact }]
  } catch (error) {
    console.warn(
      'Skipping an unreadable contact',
      item?._links?.self?.href,
      error
    )
    return []
  }
}

// The domain book is stored as dab, while its contacts are in domain-members
function toStoreAddressBookId(href: unknown): AddressBookId {
  return fromServerBookId(extractAddressBookIdFromHref(href))
}

// A card URL serves both its jCard and its vCard: the server neither varies
// on Accept nor gives them distinct ETags, so the browser cache would answer
// one with the other (#650). Reads of a card stay out of the HTTP cache.
const UNCACHED: RequestCache = 'no-store'

export async function fetchContact(
  book: AddressBook,
  contactId: ContactId
): Promise<Contact> {
  return readCard({
    path: cardPath(toServerBookRef(book), contactId),
    contactId
  })
}

/** The card as saved now in the book, with its ETag. */
export async function fetchSavedContact(
  userId: UserId,
  bookId: AddressBookId,
  contactId: ContactId
): Promise<Contact> {
  return readCard({
    path: cardPath({ userId, bookId }, contactId),
    contactId
  })
}

async function readCard(
  { path, contactId }: CardRequestTarget,
  options: Options = {}
): Promise<Contact> {
  const response = await api.get(path, {
    cache: UNCACHED,
    headers: { Accept: 'application/vcard+json' },
    ...options
  })
  const data = await response.json<JCalCard>()

  // the route id is the one to look the contact up with, not its encoded form
  return {
    ...normalizeContact({
      _links: { self: { href: path } },
      data,
      etag: etagOf(response)
    }),
    id: contactId
  }
}

// esn-sabre tags the jCard with the ETag of the stored vCard suffixed by
// -json, but evaluates If-Match against the stored ETag only (#854)
const JSON_REPRESENTATION_ETAG = /-json("?)$/

// The ETag of the stored card, the one If-Match is evaluated against;
// undefined when the server sends none, or when CORS does not expose it
function etagOf(response: Response): string | undefined {
  return (
    response.headers.get('ETag')?.replace(JSON_REPRESENTATION_ETAG, '$1') ??
    undefined
  )
}

/** A fresh snapshot for destructive merges; fail closed without a strong ETag. */
export async function fetchContactForMerge(
  book: AddressBook,
  contactId: ContactId
): Promise<MergedContactSnapshot> {
  const contact = await fetchContact(book, contactId)
  if (!contact.etag || contact.etag.startsWith('W/')) {
    throw new Error('Missing strong ETag')
  }
  return { contact, etag: contact.etag }
}

/** Whether the saved card is a new one, or an update of the version read. */
export type SaveMode = 'create' | 'update'

// a creation must not replace an existing card; an update must not replace a
// version other than the one read (HTTP 412 otherwise, RFC 9110 §13.1)
function preconditionHeaders(
  contact: Contact,
  mode: SaveMode
): Record<string, string> {
  if (mode === 'create') return { 'If-None-Match': '*' }
  return contact.etag ? { 'If-Match': contact.etag } : {}
}

// esn-sabre answers a JSON PUT without ETag, the card being stored as a vCard:
// the saved card is read back, its content together with its ETag, so that a
// change saved meanwhile by someone else is never labelled as the version
// shown. Not retried: the save is done, only the guard of the next update
// is at stake.
async function readSaved(
  target: CardRequestTarget,
  contact: Contact
): Promise<Contact> {
  try {
    return await readCard(target, { retry: 0 })
  } catch {
    // the card is saved: only the guard of the next update is lost
    return { ...contact, etag: undefined }
  }
}

// The domain book is read from its members collection
function toServerBookRef(book: RawAddressBook): DavBookRef {
  return { userId: book.userId, bookId: toServerBookId(book.id) }
}

function toDavBookRef({ userId, addressBookId }: AddressBookRef): DavBookRef {
  return { userId, bookId: addressBookId }
}

/** Every contact of the book as a single vCard file. */
export async function exportAddressBook(book: AddressBook): Promise<Blob> {
  return api
    .get(bookJsonPath(toServerBookRef(book)), {
      searchParams: { export: 'true' },
      headers: { Accept: 'application/vcard' }
    })
    .blob()
}

/** One contact of the book as a vCard file. */
export async function exportContact(
  book: AddressBook,
  contactId: ContactId
): Promise<Blob> {
  return api
    .get(cardPath(toServerBookRef(book), contactId), {
      cache: UNCACHED,
      headers: { Accept: 'text/vcard' }
    })
    .blob()
}

/**
 * Writes the card, refused with HTTP 412 when it exists already (creation) or
 * changed since it was read (update). Resolves with the saved card and its
 * ETag, undefined when it cannot be known.
 */
export async function saveContact(
  userId: UserId,
  bookId: AddressBookId,
  contact: Contact,
  mode: SaveMode
): Promise<Contact> {
  const path = cardPath({ userId, bookId }, contact.id)
  const response = await api.put(path, {
    headers: {
      'Content-Type': 'application/vcard+json',
      ...preconditionHeaders(contact, mode)
    },
    json: denormalizeContact(contact)
  })
  const etag = etagOf(response)
  return etag
    ? { ...contact, etag }
    : readSaved({ path, contactId: contact.id }, contact)
}

export async function deleteContact(
  userId: UserId,
  bookId: AddressBookId,
  contactId: ContactId,
  etag?: ContactEtag
): Promise<void> {
  await api.delete(
    cardPath({ userId, bookId }, contactId),
    ...(etag ? [{ headers: { 'If-Match': etag } }] : [])
  )
}

export async function copyContact(
  source: AddressBookRef,
  destination: AddressBookRef,
  contactId: ContactId
): Promise<ContactId> {
  const destinationContactId = crypto.randomUUID()
  await api(cardPath(toDavBookRef(source), contactId), {
    method: 'COPY',
    headers: {
      Accept: 'application/json, text/plain, */*',
      'Content-Type': 'application/json;charset=UTF-8',
      // Sabre resolves this header internally; /dav belongs to the API proxy.
      Destination: cardHref(toDavBookRef(destination), destinationContactId),
      Overwrite: 'F'
    }
  })
  return destinationContactId
}

export async function moveContact(
  source: AddressBookRef,
  destination: AddressBookRef,
  contactId: ContactId
): Promise<void> {
  await api(cardPath(toDavBookRef(source), contactId), {
    method: 'MOVE',
    headers: {
      Accept: 'application/json, text/plain, */*',
      'Content-Type': 'application/json;charset=UTF-8',
      Destination: cardHref(toDavBookRef(destination), contactId),
      Overwrite: 'F'
    }
  })
}

export async function uploadImportFile(file: File): Promise<ImportFileId> {
  const data = await api
    .post('api/files', {
      searchParams: {
        mimetype: 'text/vcard',
        name: file.name,
        size: String(file.size)
      },
      body: file
    })
    .json<{ _id: ImportFileId }>()

  return data._id
}

export async function importContacts(
  fileId: ImportFileId,
  target: ImportTarget
): Promise<void> {
  await api.post('linagora.esn.dav.import/api/import', {
    json: { fileId, target }
  })
}

export interface AddressBookRef {
  userId: UserId
  addressBookId: AddressBookId
}

export interface MultiAddressBookSearchRequest {
  query: SearchQuery
  addressBooks: AddressBookRef[]
}

/** Reads the decoded collection ID from a card href, or an empty ID if absent. */
function extractAddressBookIdFromHref(href: unknown): AddressBookId {
  return decodeDavSegment(readHref(href)?.split('/').at(-2) ?? '')
}

export async function searchContacts(
  addressBooks: AddressBook[],
  search: SearchQuery
): Promise<ContactEntry[]> {
  const requestBody: MultiAddressBookSearchRequest = {
    query: search,
    addressBooks: addressBooks.map(book => ({
      userId: book.userId,
      addressBookId: toServerBookId(book.id)
    }))
  }

  const response = api.post('contacts/api/contacts/search', {
    searchParams: {
      limit: String(SEARCH_LIMIT),
      offset: '0'
    },
    json: requestBody
  })
  const data: DavContactsResponse = await response.json()

  const items = data._embedded?.['dav:item'] ?? []
  return items.flatMap(item => {
    const addressBookId = toStoreAddressBookId(item?._links?.self?.href)
    return addressBookId ? readContactEntry(item, addressBookId) : []
  })
}

export async function createAddressBook(
  userId: UserId,
  name: AddressBookName
): Promise<AddressBook> {
  const id = crypto.randomUUID()
  await api.post(userBooksPath(userId), {
    headers: {
      Accept: 'application/vcard+json'
    },
    json: {
      id,
      'dav:name': name,
      'dav:acl': ['dav:read', 'dav:write'],
      type: 'user'
    }
  })

  return classifyAddressBook(
    {
      id,
      userId,
      name,
      contactsCount: 0,
      acl: ['dav:read', 'dav:write'],
      canWrite: true
    },
    userId
  )
}
const MAILTO_SCHEME = /^mailto:/i

/**
 * Builds a member from its invite alone, listable before (or without) the
 * lookup of its profile: identified by its principal, named by its email.
 * An invite without a principal and with a `mailto:` href is an external
 * sharee: it has no user id, only its email and its href.
 */
function toInviteMember(invite: DavInvite): userData {
  const principal = asString(invite.principal)
  const href = asString(invite.href)
  const isExternal = MAILTO_SCHEME.test(href)
  const principalPath = principal || (isExternal ? '' : href)
  const memberUserId = principalPath.split('/').pop() || undefined
  const email = isExternal ? stripMailto(href) : ''

  return {
    email,
    given_name: '',
    family_name: '',
    name: email || memberUserId || '',
    sid: memberUserId ?? '',
    sub: memberUserId ?? '',
    openpaasId: memberUserId,
    role: invite.access,
    href: href || undefined
  }
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

/**
 * The invites come untrusted from the JSON answer: an entry that is not an
 * object, or that has neither a string principal nor a string href, cannot
 * identify a member and is skipped.
 */
function isUsableInvite(invite: unknown): invite is DavInvite {
  if (typeof invite !== 'object' || invite === null) return false
  const { principal, href } = invite as Partial<
    Record<keyof DavInvite, unknown>
  >
  return asString(principal) !== '' || asString(href) !== ''
}

/**
 * Completes a member built from its invite with its profile. Never rejects:
 * a member whose profile cannot be fetched is kept as it is.
 */
export async function resolveAddressBookMember(
  member: userData
): Promise<userData> {
  if (!member.openpaasId) return member

  try {
    const user = ToUserData(await fetchUserById(member.openpaasId))
    return user ? { ...user, role: member.role, href: member.href } : member
  } catch (e) {
    console.warn('Failed to fetch user', member.openpaasId, e)
    return member
  }
}

function propfindAddressBook(
  book: DavBookRef,
  properties: string[]
): Promise<DavAddressBookItem> {
  return api(bookJsonPath(book), {
    method: 'PROPFIND',
    json: { properties }
  }).json<DavAddressBookItem>()
}

const isPublishedAcl = (book: DavAddressBookItem): boolean =>
  (book.acl ?? []).some(entry => entry.principal === '{DAV:}authenticated')

/**
 * The ACL of a delegated copy only carries the sharee's own rights: whether
 * the book is published is read from the ACL of its source book.
 */
async function isSourceBookPublished(source: DavBookRef): Promise<boolean> {
  return isPublishedAcl(await propfindAddressBook(source, ['acl']))
}

/**
 * @param source the book of the owner when the book is a delegated copy of it
 */
export async function fetchAddressBookDetails(
  userId: UserId,
  addressBookId: AddressBookId,
  source?: DavBookRef
): Promise<AddressBookDetailsResult> {
  try {
    const [response, sourceIsPublic] = await Promise.all([
      propfindAddressBook({ userId, bookId: addressBookId }, [
        '{DAV:}invite',
        'acl'
      ]),
      source ? isSourceBookPublished(source) : undefined
    ])

    const invites = response['{DAV:}invite']
    const isPublic = sourceIsPublic ?? isPublishedAcl(response)

    const members = (Array.isArray(invites) ? invites : [])
      .filter(isUsableInvite)
      .map(toInviteMember)

    return { members, isPublic }
  } catch (error) {
    console.error('Failed to fetch address book details:', error)
    throw error
  }
}

export interface ShareeUpdate {
  userId: UserId
  access: AddressBookAccessLevel
  href: string
}

export async function updateAddressBookShares(
  userId: UserId,
  addressBookId: AddressBookId,
  sharees: ShareeUpdate[]
): Promise<void> {
  await api.post(bookJsonPath({ userId, bookId: addressBookId }), {
    headers: {
      Accept: 'application/vcard+json'
    },
    json: {
      'dav:share-resource': {
        'dav:sharee': sharees.map(s => ({
          'dav:href': s.href,
          'dav:share-access': s.access
        }))
      }
    }
  })
}

interface PeopleSearchResult {
  id: UserId
  names?: { displayName: string }[]
  emailAddresses?: { value: string }[]
}

export async function searchUsers(
  q: SearchQuery,
  excludeId: UserId,
  signal?: AbortSignal
): Promise<UserResult[]> {
  const data: PeopleSearchResult[] = await api
    .post('api/people/search', {
      json: {
        q,
        objectTypes: ['user'],
        limit: 5,
        excludes: [{ id: excludeId, objectType: 'user' }]
      },
      signal
    })
    .json()

  return data.map(p => ({
    id: p.id,
    displayName:
      p.names?.[0]?.displayName ?? p.emailAddresses?.[0]?.value ?? '',
    emails: p.emailAddresses ?? []
  }))
}

// the owner's own books, which are not classified: they are not the user's
export async function fetchSubscribableAddressBooks(
  ownerId: UserId
): Promise<RawAddressBook[]> {
  const data: DavAddressBooksResponse = await api
    .get(userBooksPath(ownerId), {
      // ?personal lists the owner's books the user can read: the public ones and the ones
      // delegated to the user, including those removed from their list (Sabre restores the
      // delegation on subscription)
      searchParams: { personal: 'true', contactsCount: 'true' },
      headers: { Accept: 'application/vcard+json' }
    })
    .json()

  return (data._embedded?.['dav:addressbook'] ?? []).map(normalizeAddressBook)
}

export async function subscribeToAddressBook(
  userId: UserId,
  source: RawAddressBook,
  ownerDisplayName?: AddressBookName
): Promise<AddressBook> {
  const id = crypto.randomUUID()
  await api.post(userBooksPath(userId), {
    headers: { Accept: 'application/vcard+json' },
    json: {
      id,
      'dav:name': source.name,
      'carddav:description': '',
      'dav:acl': ['dav:read', 'dav:write']?.filter(
        right => right === 'dav:write' && source.canWrite
      ),
      type: 'subscription',
      'openpaas:source': {
        _links: {
          self: {
            href: bookJsonHref({ userId: source.userId, bookId: source.id })
          }
        }
      }
    }
  })

  const subscribed = await readBackAddressBook({ userId, bookId: id })
  if (subscribed) {
    return {
      ...subscribed,
      ownerDisplayName: subscribed.ownerDisplayName ?? ownerDisplayName
    }
  }

  return classifyAddressBook(
    {
      id,
      userId,
      sourceBookId: source.id,
      name: source.name,
      contactsCount: source.contactsCount,
      acl: ['dav:read'],
      canWrite: false,
      ownerId: source.userId,
      ownerDisplayName:
        (await fetchOwnerDisplayName(source.userId)) ?? ownerDisplayName
    },
    userId
  )
}

// Subscribing to a book delegated to the user restores the delegation, with its role,
// instead of creating a read-only subscription: the book is read back for its real rights
async function readBackAddressBook(
  target: DavBookRef
): Promise<AddressBook | undefined> {
  try {
    const raw = (await fetchAddressBookItems(target.userId)).find(
      book => normalizeAddressBook(book).id === target.bookId
    )
    return raw && (await enrichAddressBookOwner(raw, target.userId))
  } catch {
    console.warn(`Failed to read back the address book ${target.bookId}`)
    return undefined
  }
}

export async function deleteAddressBook(
  userId: UserId,
  addressBookId: AddressBookId
): Promise<void> {
  await api.delete(bookJsonPath({ userId, bookId: addressBookId }), {
    headers: { Accept: 'application/vcard+json' }
  })
}

export const updateAddressBook = async (
  userId: UserId,
  addressBookId: AddressBookId,
  { name }: AddressBookNameUpdate
): Promise<void> => {
  await api(bookJsonPath({ userId, bookId: addressBookId }), {
    method: 'PROPPATCH',
    headers: { Accept: 'application/vcard+json' },
    body: JSON.stringify({
      'dav:name': name,
      'carddav:description': '',
      state: ''
    })
  })
}

export async function setAddressBookPublished(
  userId: UserId,
  addressBookId: AddressBookId,
  publish: PublishBookFlag
): Promise<void> {
  await api.post(bookJsonPath({ userId, bookId: addressBookId }), {
    headers: {
      Accept: 'application/json, text/plain, */*'
    },
    json: publish
      ? { 'dav:publish-addressbook': { privilege: '{DAV:}read' } }
      : { 'dav:unpublish-addressbook': true }
  })
}
