import { api } from '@common/utils/apiUtils'
import { encodeDavSegment } from '@linagora/twake-utils'
import { fetchUserById } from '@common/features/User/UserDao'
import { DomainInfo } from '@common/features/User/userDataTypes'
import { AddressBook, Contact, ContactEntry } from './contactsTypes'
import {
  AddressBookAccessLevel,
  DavAddressBookItem,
  DavAddressBooksResponse,
  DavContactsResponse,
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

export async function fetchAddressBooks(
  userId: string,
  domains?: DomainInfo[]
): Promise<AddressBook[]> {
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

  const books = data._embedded?.['dav:addressbook'] ?? []
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

  try {
    const user = await fetchUserById(ownerId)
    const name = [user.firstname, user.lastname].filter(Boolean).join(' ')
    if (name) {
      book.ownerDisplayName = name
    }
  } catch {
    console.warn(`Failed to fetch owner for address book ${book.id}`)
  }

  return book
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

export async function fetchContactsForBook(
  book: AddressBook,
  userId: string,
  limit: number = CONTACTS_PAGINATION_LIMIT,
  offset: number = 0
): Promise<{ contacts: Contact[]; hasMore: boolean }> {
  const isDomainBook = book.id === 'dab'

  const url = isDomainBook
    ? `dav/addressbooks/${book.userId}/domain-members.json`
    : `dav/addressbooks/${book.userId}/${book.id}.json`

  const searchParams = isDomainBook
    ? { limit: limit.toString(), offset: offset.toString(), sort: 'fn', userId }
    : { limit: limit.toString(), offset: offset.toString(), sort: 'fn' }

  const response = api.get(url, { searchParams })
  const data: DavContactsResponse = await response.json()

  const items = data._embedded?.['dav:item'] ?? []
  const contacts = items.map(normalizeContact)
  const hasMore = data._links?.next?.href !== undefined

  return { contacts, hasMore }
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

export async function moveContact(
  userId: string,
  fromBookId: string,
  toBookId: string,
  contact: Contact
): Promise<void> {
  await saveContact(userId, toBookId, contact)
  await deleteContact(userId, fromBookId, contact.id)
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
export async function fetchAddressBookDetails(
  userId: string,
  addressBookId: string
): Promise<userData[]> {
  try {
    const response = await api(
      `dav/addressbooks/${userId}/${addressBookId}.json`,
      {
        method: 'PROPFIND',
        json: {
          properties: ['{DAV:}invite']
        }
      }
    ).json<DavAddressBookItem>()

    const invites = response['{DAV:}invite']

    if (!invites) return []

    const members = await Promise.all(
      invites.map(async (invite: DavInvite) => {
        const principalStr = invite.principal || invite.href || ''
        const memberUserId = principalStr.split('/').pop()

        if (!memberUserId) return null

        try {
          const user = await fetchUserById(memberUserId)
          const mappedUser = ToUserData(user)
          if (!mappedUser) return undefined
          mappedUser.role = invite.access
          mappedUser.href = invite.href
          return mappedUser
        } catch (e) {
          console.warn('Failed to fetch user', memberUserId, e)
          return undefined
        }
      })
    )

    return members.filter((user): user is userData => user != null)
  } catch (error) {
    console.error('Failed to fetch address book details:', error)
    return []
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
