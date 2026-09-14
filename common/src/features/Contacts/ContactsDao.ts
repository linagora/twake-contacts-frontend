import { api } from '@common/utils/apiUtils'
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
  const userBooks = books.map(normalizeAddressBook)

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
              '{http://open-paas.org/contacts}subscription-type',
              '{http://open-paas.org/contacts}source',
              '{http://open-paas.org/contacts}type',
              '{http://open-paas.org/contacts}state',
              '{http://open-paas.org/contacts}numberOfContacts',
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
    name: raw['{DAV:}displayname'] ?? 'Domain Address Book',
    contactsCount: raw['{http://open-paas.org/contacts}numberOfContacts'] ?? 0,
    acl,
    canWrite: acl.some(p => p === '{DAV:}write-content' || p === '{DAV:}bind')
  }
}

export async function fetchContactsForBook(
  book: AddressBook,
  userId: string
): Promise<Contact[]> {
  const isDomainBook = book.id === 'dab'

  const url = isDomainBook
    ? `dav/addressbooks/${book.userId}/domain-members.json`
    : `dav/addressbooks/${book.userId}/${book.id}.json`

  const searchParams = isDomainBook
    ? { limit: '500', offset: '0', sort: 'fn', userId }
    : { limit: '500', offset: '0', sort: 'fn' }

  const response = api.get(url, { searchParams })
  const data: DavContactsResponse = await response.json()

  const items = data._embedded?.['dav:item'] ?? []
  return items.map(normalizeContact)
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
