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

async function fetchAddressBookItems(
  userId: string
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
  userId: string,
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

/** Resolves decoded source IDs and the owner's display name before classifying a book. */
async function enrichAddressBookOwner(
  rawBook: DavAddressBookItem,
  userId: string
): Promise<AddressBook> {
  const book = normalizeAddressBook(rawBook)
  const source = readAddressBookSource(rawBook)

  if (!source) return classifyAddressBook(book, userId)

  // e.g. /addressbooks/6498ffa1d48f620025cc9dc2/431ae469-dfee-4b0a-a976-e04a12661b34.json
  const parts = source.split('/')
  if (parts.length < 3) return classifyAddressBook(book, userId)

  const ownerId = decodeDavSegment(parts[2] ?? '')
  if (!ownerId || ownerId === userId) return classifyAddressBook(book, userId)
  book.ownerId = ownerId
  book.sourceBookId = decodeDavSegment(parts[3]?.replace('.json', '') ?? '')

  const [name, sourceContactsCount] = await Promise.all([
    fetchOwnerDisplayName(ownerId),
    book.contactsCount == null
      ? fetchSourceContactsCount({ userId: ownerId, bookId: book.sourceBookId })
      : undefined
  ])
  if (name) {
    book.ownerDisplayName = name
  }
  if (sourceContactsCount != null) {
    book.contactsCount = sourceContactsCount
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
  ownerId: string
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
  userId: string
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
        domainBooks.push(
          normalizeDomainAddressBook(data, domain.domainId, userId)
        )
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
  domainId: string,
  userId: string
): AddressBook {
  const acl = raw['{DAV:}acl'] ?? []
  return classifyAddressBook(
    {
      id: DOMAIN_ADDRESS_BOOK_ID,
      userId: domainId,
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
  userId: string,
  book: AddressBook | null,
  withDomainMembers: boolean
): { url: string; searchParams: Record<string, string> } {
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

/**
 * One page of the contacts of a book, or of every book of the user when book
 * is null, in the sort order. after is the next cursor of the previous page,
 * read in the same order, withDomainMembers adds the domain members to the
 * contacts of every book.
 */
export async function fetchContactsPage(
  userId: string,
  book: AddressBook | null,
  { after, sort }: { after: string | null; sort: ContactSort },
  withDomainMembers: boolean,
  options?: { cache?: RequestCache }
): Promise<{ entries: ContactEntry[]; next: string | null }> {
  const { url, searchParams } = getContactsPageUrl(
    userId,
    book,
    withDomainMembers
  )
  const data: DavContactsResponse = await api
    .get(url, {
      searchParams: {
        ...searchParams,
        sort: sort.by,
        order: sort.order,
        limit: String(CONTACTS_PAGINATION_LIMIT),
        ...(after ? { after } : {})
      },
      ...(options?.cache ? { cache: options.cache } : {})
    })
    .json()

  const items = data._embedded?.['dav:item'] ?? []
  return {
    entries: items.flatMap(item =>
      readContactEntry(
        item,
        book?.id ?? toStoreAddressBookId(item?._links?.self?.href)
      )
    ),
    next: data.next ?? null
  }
}

/**
 * The entry of a card of a listing or a search, or none when the card cannot
 * be read: one unreadable card must not keep the others of its page hidden.
 */
function readContactEntry(
  item: DavContactItem,
  addressBookId: string
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
function toStoreAddressBookId(href: unknown): string {
  return fromServerBookId(extractAddressBookIdFromHref(href))
}

// A card URL serves both its jCard and its vCard: the server neither varies
// on Accept nor gives them distinct ETags, so the browser cache would answer
// one with the other (#650). Reads of a card stay out of the HTTP cache.
const UNCACHED: RequestCache = 'no-store'

export async function fetchContact(
  book: AddressBook,
  contactId: string
): Promise<Contact> {
  return readCard(cardPath(toServerBookRef(book), contactId), contactId)
}

/** The card as saved now in the book, with its ETag. */
export async function fetchSavedContact(
  userId: string,
  bookId: string,
  contactId: string
): Promise<Contact> {
  return readCard(cardPath({ userId, bookId }, contactId), contactId)
}

async function readCard(
  path: string,
  contactId: string,
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
  contactId: string
): Promise<{ contact: Contact; etag: string }> {
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
async function readSaved(path: string, contact: Contact): Promise<Contact> {
  try {
    return await readCard(path, contact.id, { retry: 0 })
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
  contactId: string
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
  userId: string,
  bookId: string,
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
  return etag ? { ...contact, etag } : readSaved(path, contact)
}

export async function deleteContact(
  userId: string,
  bookId: string,
  contactId: string,
  etag?: string
): Promise<void> {
  await api.delete(
    cardPath({ userId, bookId }, contactId),
    ...(etag ? [{ headers: { 'If-Match': etag } }] : [])
  )
}

export async function copyContact(
  source: AddressBookRef,
  destination: AddressBookRef,
  contactId: string
): Promise<string> {
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
  contactId: string
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

export async function uploadImportFile(file: File): Promise<string> {
  const data = await api
    .post('api/files', {
      searchParams: {
        mimetype: 'text/vcard',
        name: file.name,
        size: String(file.size)
      },
      body: file
    })
    .json<{ _id: string }>()

  return data._id
}

export async function importContacts(
  fileId: string,
  target: string
): Promise<void> {
  await api.post('linagora.esn.dav.import/api/import', {
    json: { fileId, target }
  })
}

export interface AddressBookRef {
  userId: string
  addressBookId: string
}

export interface MultiAddressBookSearchRequest {
  query: string
  addressBooks: AddressBookRef[]
}

/** Reads the decoded collection ID from a card href, or an empty ID if absent. */
function extractAddressBookIdFromHref(href: unknown): string {
  return decodeDavSegment(readHref(href)?.split('/').at(-2) ?? '')
}

export async function searchContacts(
  addressBooks: AddressBook[],
  search: string
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
  userId: string,
  name: string
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
  userId: string,
  addressBookId: string,
  source?: DavBookRef
): Promise<{ members: userData[]; isPublic: boolean }> {
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
  userId: string
  access: AddressBookAccessLevel
  href: string
}

export async function updateAddressBookShares(
  userId: string,
  addressBookId: string,
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
  id: string
  names?: { displayName: string }[]
  emailAddresses?: { value: string }[]
}

export async function searchUsers(
  q: string,
  excludeId: string,
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
  ownerId: string
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
  userId: string,
  source: RawAddressBook,
  ownerDisplayName?: string
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

  const subscribed = await readBackAddressBook(userId, id)
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
  userId: string,
  addressBookId: string
): Promise<AddressBook | undefined> {
  try {
    const raw = (await fetchAddressBookItems(userId)).find(
      book => normalizeAddressBook(book).id === addressBookId
    )
    return raw && (await enrichAddressBookOwner(raw, userId))
  } catch {
    console.warn(`Failed to read back the address book ${addressBookId}`)
    return undefined
  }
}

export async function deleteAddressBook(
  userId: string,
  addressBookId: string
): Promise<void> {
  await api.delete(bookJsonPath({ userId, bookId: addressBookId }), {
    headers: { Accept: 'application/vcard+json' }
  })
}

export const updateAddressBook = async (
  userId: string,
  addressBookId: string,
  { name }: { name: string }
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
  userId: string,
  addressBookId: string,
  publish: boolean
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
