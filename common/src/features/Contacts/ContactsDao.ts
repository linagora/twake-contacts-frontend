import { api } from '@common/utils/apiUtils'
import { encodeDavSegment } from '@linagora/twake-utils'
import { fetchUserById } from '@common/features/User/UserDao'
import { DomainInfo } from '@common/features/User/userDataTypes'
import {
  AddressBook,
  Contact,
  ContactEntry,
  ContactSort,
  UserResult
} from './contactsTypes'
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
  normalizeContact
} from './transformer/ContactsTransformer'
import { CONTACTS_PAGINATION_LIMIT, SEARCH_LIMIT } from './constants'
import { ToUserData } from '../User/type/OpenPaasUserData'
import { userData } from '../User/userDataTypes'

const CONTACTS_NS = window.CONTACTS_NS ?? 'http://open-paas.org/contacts'

async function fetchAddressBookItems(
  userId: string
): Promise<DavAddressBookItem[]> {
  const response = api.get(`dav/addressbooks/${userId}.json`, {
    searchParams: {
      contactsCount: 'true',
      inviteStatus: '2',
      personal: 'true',
      shared: 'true',
      subscribed: 'true'
    }
  })
  const data: DavAddressBooksResponse = await response.json()

  return data._embedded?.['dav:addressbook'] ?? []
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
    const domainBooks = await fetchDomainAddressBooks(domains)
    return [...userBooks, ...domainBooks]
  }

  return userBooks
}

async function enrichAddressBookOwner(
  rawBook: DavAddressBookItem,
  userId: string
): Promise<AddressBook> {
  const book = normalizeAddressBook(rawBook)
  const source =
    rawBook['{http://open-paas.org/contacts}source'] ||
    rawBook['openpaas:source']

  if (!source) return book

  // e.g. /addressbooks/6498ffa1d48f620025cc9dc2/431ae469-dfee-4b0a-a976-e04a12661b34.json
  const parts = source.split('/')
  if (parts.length < 3) return book

  const ownerId = parts[2]
  if (!ownerId || ownerId === userId) return book
  book.ownerId = ownerId
  book.sourceBookId = parts[3]?.replace('.json', '')

  const name = await fetchOwnerDisplayName(ownerId)
  if (name) {
    book.ownerDisplayName = name
  }

  return book
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
  domains: DomainInfo[]
): Promise<AddressBook[]> {
  const domainBooks: AddressBook[] = []

  await Promise.all(
    domains.map(async domain => {
      try {
        const response = api(`dav/addressbooks/${domain.domainId}/dab.json`, {
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
        })
        const data: DavAddressBookItem = await response.json()
        domainBooks.push(normalizeDomainAddressBook(data, domain.domainId))
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
  domainId: string
): AddressBook {
  const acl = raw['{DAV:}acl'] ?? []
  return {
    id: 'dab',
    userId: domainId,
    name: raw['{DAV:}displayname'] ?? '',
    contactsCount: raw[`{${CONTACTS_NS}}numberOfContacts`] ?? null,
    acl,
    canWrite: acl.some(p => p === '{DAV:}write-content' || p === '{DAV:}bind')
  }
}

function getContactsPageUrl(
  userId: string,
  book: AddressBook | null,
  withDomainMembers: boolean
): { url: string; searchParams: Record<string, string> } {
  if (!book) {
    return {
      url: `dav/contacts/${userId}.json`,
      searchParams: { domainMember: String(withDomainMembers) }
    }
  }
  if (book.id === 'dab') {
    return {
      url: `dav/addressbooks/${book.userId}/domain-members.json`,
      searchParams: { userId }
    }
  }
  return {
    url: `dav/addressbooks/${book.userId}/${book.id}.json`,
    searchParams: {}
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
function toStoreAddressBookId(href: string | undefined): string {
  const addressBookId = extractAddressBookIdFromHref(href)
  return addressBookId === 'domain-members' ? 'dab' : addressBookId
}

export async function fetchContact(
  book: AddressBook,
  contactId: string
): Promise<Contact> {
  const href = `${getBookPath(book)}/${encodeDavSegment(contactId)}.vcf`

  const data: JCalCard = await api
    .get(href, { headers: { Accept: 'application/vcard+json' } })
    .json()

  // the route id is the one to look the contact up with, not its encoded form
  return {
    ...normalizeContact({ _links: { self: { href } }, data }),
    id: contactId
  }
}

function getBookPath(book: AddressBook): string {
  return book.id === 'dab'
    ? `dav/addressbooks/${book.userId}/domain-members`
    : `dav/addressbooks/${book.userId}/${book.id}`
}

/** Every contact of the book as a single vCard file. */
export async function exportAddressBook(book: AddressBook): Promise<Blob> {
  return api
    .get(`${getBookPath(book)}.json`, {
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
    .get(`${getBookPath(book)}/${encodeDavSegment(contactId)}.vcf`, {
      headers: { Accept: 'text/vcard' }
    })
    .blob()
}

export async function saveContact(
  userId: string,
  bookId: string,
  contact: Contact
): Promise<void> {
  const encodedContactId = encodeDavSegment(contact.id)
  await api.put(
    `dav/addressbooks/${userId}/${bookId}/${encodedContactId}.vcf`,
    {
      headers: { 'Content-Type': 'application/vcard+json' },
      json: denormalizeContact(contact)
    }
  )
}

export async function deleteContact(
  userId: string,
  bookId: string,
  contactId: string
): Promise<void> {
  const encodedContactId = encodeDavSegment(contactId)
  await api.delete(
    `dav/addressbooks/${userId}/${bookId}/${encodedContactId}.vcf`
  )
}

export async function copyContact(
  source: AddressBookRef,
  destination: AddressBookRef,
  contactId: string
): Promise<string> {
  const destinationContactId = crypto.randomUUID()
  const path = (book: AddressBookRef, cardId: string): string =>
    `/addressbooks/${encodeDavSegment(book.userId)}/${encodeDavSegment(book.addressBookId)}/${encodeDavSegment(cardId)}.vcf`
  await api(`dav${path(source, contactId)}`, {
    method: 'COPY',
    headers: {
      Accept: 'application/json, text/plain, */*',
      'Content-Type': 'application/json;charset=UTF-8',
      // Sabre resolves this header internally; /dav belongs to the API proxy.
      Destination: path(destination, destinationContactId),
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
  const path = (book: AddressBookRef): string =>
    `/addressbooks/${encodeDavSegment(book.userId)}/${encodeDavSegment(book.addressBookId)}/${encodeDavSegment(contactId)}.vcf`
  await api(`dav${path(source)}`, {
    method: 'MOVE',
    headers: {
      Accept: 'application/json, text/plain, */*',
      'Content-Type': 'application/json;charset=UTF-8',
      Destination: path(destination),
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

function extractAddressBookIdFromHref(href: string | undefined): string {
  return href?.split('/').at(-2) ?? ''
}

export async function searchContacts(
  addressBooks: AddressBookRef[],
  search: string
): Promise<ContactEntry[]> {
  const requestBody: MultiAddressBookSearchRequest = {
    query: search,
    addressBooks
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
    const addressBookId = extractAddressBookIdFromHref(item._links?.self?.href)
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
  await api.post(`dav/addressbooks/${userId}.json`, {
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

  return {
    id,
    userId,
    name,
    contactsCount: 0,
    acl: ['dav:read', 'dav:write'],
    canWrite: true
  }
}
const MAILTO_PREFIX = 'mailto:'

/**
 * Builds a member from its invite alone, listable before (or without) the
 * lookup of its profile: identified by its principal, named by its email.
 */
function toInviteMember(invite: DavInvite): userData {
  const memberUserId =
    (invite.principal || invite.href || '').split('/').pop() || undefined
  const email = invite.href?.startsWith(MAILTO_PREFIX)
    ? invite.href.slice(MAILTO_PREFIX.length)
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
    href: invite.href
  }
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
      `dav/addressbooks/${userId}/${addressBookId}.json`,
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

    const members = (invites ?? []).map(toInviteMember)

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
  await api.post(`dav/addressbooks/${userId}/${addressBookId}.json`, {
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

export async function fetchSubscribableAddressBooks(
  ownerId: string
): Promise<AddressBook[]> {
  const data: DavAddressBooksResponse = await api
    .get(`dav/addressbooks/${ownerId}.json`, {
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
  source: AddressBook,
  ownerDisplayName?: string
): Promise<AddressBook> {
  const id = crypto.randomUUID()
  await api.post(`dav/addressbooks/${userId}.json`, {
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
          self: { href: `/addressbooks/${source.userId}/${source.id}.json` }
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

  return {
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
  }
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
  await api.delete(`dav/addressbooks/${userId}/${addressBookId}.json`, {
    headers: { Accept: 'application/vcard+json' }
  })
}

export const updateAddressBook = async (
  userId: string,
  addressBookId: string,
  { name }: { name: string }
): Promise<void> => {
  await api(`dav/addressbooks/${userId}/${addressBookId}.json`, {
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
  await api.post(`dav/addressbooks/${userId}/${addressBookId}.json`, {
    headers: {
      Accept: 'application/json, text/plain, */*'
    },
    json: publish
      ? { 'dav:publish-addressbook': { privilege: '{DAV:}read' } }
      : { 'dav:unpublish-addressbook': true }
  })
}
