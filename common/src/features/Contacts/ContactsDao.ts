import { davApi } from '@common/utils/apiUtils'
import { AddressBook, Contact } from './contactsTypes'

interface RawAddressBook {
  'dav:name'?: string
  numberOfContacts?: number
  _links?: {
    self?: { href?: string }
  }
}

interface RawAddressBooksResponse {
  _embedded?: {
    'dav:addressbook'?: RawAddressBook[]
  }
}

export async function fetchAddressBooks(
  userId: string
): Promise<AddressBook[]> {
  const response = davApi.get(`addressbooks/${userId}.json`, {
    searchParams: {
      contactsCount: 'true',
      inviteStatus: '2',
      personal: 'true',
      shared: 'true',
      subscribed: 'true'
    }
  })
  const data: RawAddressBooksResponse = await response.json()

  const books = extractAddressBooks(data)
  return books.map(normalizeAddressBook)
}

function extractAddressBooks(data: RawAddressBooksResponse): RawAddressBook[] {
  return data._embedded?.['dav:addressbook'] ?? []
}

function normalizeAddressBook(raw: RawAddressBook): AddressBook {
  const href = raw._links?.self?.href ?? ''
  const id = href.split('/').pop()?.replace('.json', '') ?? ''
  return {
    id,
    name: raw['dav:name'] ?? id,
    contactsCount: raw.numberOfContacts ?? 0
  }
}

type JCalProperty = [string, Record<string, unknown>, string, ...unknown[]]
type JCalData = ['vcard', JCalProperty[]]

interface RawContactsItem {
  data: JCalData
  _links?: { self?: { href?: string } }
}

interface RawContactsResponse {
  _embedded?: { 'dav:item'?: RawContactsItem[] }
}

export async function fetchContactsForBook(
  userId: string,
  bookId: string
): Promise<Contact[]> {
  const response = davApi.get(`addressbooks/${userId}/${bookId}.json`, {
    searchParams: {
      limit: '500',
      offset: '0',
      sort: 'fn',
      userId
    }
  })
  const data: RawContactsResponse = await response.json()

  const items = data._embedded?.['dav:item'] ?? []
  return items.map(normalizeContact)
}

function normalizeContact(item: RawContactsItem): Contact {
  const href = item._links?.self?.href ?? ''
  const id = href.split('/').pop()?.replace('.vcf', '') ?? ''
  const props = item.data[1]

  const fnProp = props.find(p => p[0] === 'fn')
  const emailProp = props.find(p => p[0] === 'email')

  return {
    id,
    displayName: fnProp?.[3] ?? id,
    email: emailProp?.[3] ?? null
  }
}
