import { api } from '@common/utils/apiUtils'
import { fetchUserById } from '@common/features/User/UserDao'
import { DomainInfo } from '@common/features/User/userDataTypes'
import { AddressBook, Contact } from './contactsTypes'
import {
  DavAddressBookItem,
  DavAddressBooksResponse,
  DavContactsResponse
} from './davTypes'
import {
  denormalizeContact,
  normalizeAddressBook,
  normalizeContact
} from './transformer/ContactsTransformer'
import { CONTACTS_PAGINATION_LIMIT, SEARCH_LIMIT } from './constants'

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
    books.map(async rawBook => {
      const book = normalizeAddressBook(rawBook)
      const source =
        rawBook['{http://open-paas.org/contacts}source'] ||
        rawBook['openpaas:source']

      if (source) {
        // e.g. /addressbooks/6498ffa1d48f620025cc9dc2/431ae469-dfee-4b0a-a976-e04a12661b34.json
        const parts = source.split('/')
        if (parts.length >= 3) {
          const ownerId = parts[2]
          if (ownerId && ownerId !== userId) {
            try {
              const user = await fetchUserById(ownerId)
              const name = [user.firstname, user.lastname]
                .filter(Boolean)
                .join(' ')
              if (name) {
                book.ownerDisplayName = name
              }
            } catch (e) {
              console.warn(`Failed to fetch owner for address book ${book.id}`)
            }
          }
        }
      }
      return book
    })
  )

  if (domains && domains.length > 0) {
    const domainBooks = await fetchDomainAddressBooks(domains)
    return [...userBooks, ...domainBooks]
  }

  return userBooks
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
    contactsCount: raw[`{${CONTACTS_NS}}numberOfContacts`] ?? 0,
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
  await api.put(`dav/addressbooks/${userId}/${bookId}/${contact.id}.vcf`, {
    headers: { 'Content-Type': 'application/vcard+json' },
    json: denormalizeContact(contact)
  })
}

export async function deleteContact(
  userId: string,
  bookId: string,
  contactId: string
): Promise<void> {
  await api.delete(`dav/addressbooks/${userId}/${bookId}/${contactId}.vcf`)
}

export async function uploadImportFile(file: File): Promise<string> {
  const response = await api.post('api/files', {
    searchParams: {
      mimetype: 'text/vcard',
      name: file.name,
      size: String(file.size)
    },
    body: file
  })
  const data = await response.json()
  console.log(data)
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

export async function searchContacts(
  userId: string,
  search: string
): Promise<Contact[]> {
  const response = api.get(`dav/addressbooks/${userId}.json/contacts`, {
    searchParams: {
      limit: String(SEARCH_LIMIT),
      page: '1',
      search
    }
  })
  const data: DavContactsResponse = await response.json()

  const items = data._embedded?.['dav:item'] ?? []
  return items.map(normalizeContact)
}
