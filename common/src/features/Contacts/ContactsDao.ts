import { config } from '@common/config'
import { api } from '@common/utils/apiUtils'
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
  DavContactsResponse,
  JCalCard,
  DavInvite
} from './davTypes'
import {
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

  const ownerId = parts[2]
  if (!ownerId || ownerId === userId) return classifyAddressBook(book, userId)
  book.ownerId = ownerId
  book.sourceBookId = parts[3]?.replace('.json', '')

  const name = await fetchOwnerDisplayName(ownerId)
  if (name) {
    book.ownerDisplayName = name
  }

  return classifyAddressBook(book, userId)
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
  withDomainMembers: boolean
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
      }
    })
    .json()

  const items = data._embedded?.['dav:item'] ?? []
  return {
    entries: items.map(item => ({
      addressBookId: book?.id ?? toStoreAddressBookId(item._links?.self?.href),
      contact: normalizeContact(item)
    })),
    next: data.next ?? null
  }
}

// The domain book is stored as dab, while its contacts are in domain-members
function toStoreAddressBookId(href: unknown): string {
  return fromServerBookId(extractAddressBookIdFromHref(href))
}

export async function fetchContact(
  book: AddressBook,
  contactId: string
): Promise<Contact> {
  const href = cardPath(toServerBookRef(book), contactId)

  const data: JCalCard = await api
    .get(href, { headers: { Accept: 'application/vcard+json' } })
    .json()

  // the route id is the one to look the contact up with, not its encoded form
  return {
    ...normalizeContact({ _links: { self: { href } }, data }),
    id: contactId
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
      headers: { Accept: 'text/vcard' }
    })
    .blob()
}

export async function saveContact(
  userId: string,
  bookId: string,
  contact: Contact
): Promise<void> {
  await api.put(cardPath({ userId, bookId }, contact.id), {
    headers: { 'Content-Type': 'application/vcard+json' },
    json: denormalizeContact(contact)
  })
}

export async function deleteContact(
  userId: string,
  bookId: string,
  contactId: string
): Promise<void> {
  await api.delete(cardPath({ userId, bookId }, contactId))
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

function extractAddressBookIdFromHref(href: unknown): string {
  return readHref(href)?.split('/').at(-2) ?? ''
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
    const addressBookId = toStoreAddressBookId(item._links?.self?.href)
    return addressBookId
      ? [
          {
            addressBookId,
            contact: normalizeContact(item)
          }
        ]
      : []
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
const MAILTO_PREFIX = 'mailto:'

/**
 * Builds a member from its invite alone, listable before (or without) the
 * lookup of its profile: identified by its principal, named by its email.
 */
function toInviteMember(invite: DavInvite): userData {
  const principal = asString(invite.principal)
  const href = asString(invite.href)
  const memberUserId = (principal || href).split('/').pop() || undefined
  const email = href.startsWith(MAILTO_PREFIX)
    ? href.slice(MAILTO_PREFIX.length)
    : ''

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

export async function fetchAddressBookDetails(
  userId: string,
  addressBookId: string
): Promise<{ members: userData[]; isPublic: boolean }> {
  try {
    const response = await api(
      bookJsonPath({ userId, bookId: addressBookId }),
      {
        method: 'PROPFIND',
        json: {
          properties: ['{DAV:}invite', 'acl']
        }
      }
    ).json<DavAddressBookItem>()

    const invites = response['{DAV:}invite']
    const acl = response.acl ?? []

    const isPublic = acl.some(
      entry => entry.principal === '{DAV:}authenticated'
    )

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
