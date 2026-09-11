import { davApi } from '@common/utils/apiUtils'
import { AddressBook, Contact } from './contactsTypes'
import { DavAddressBooksResponse, DavContactsResponse } from './davTypes'
import {
  denormalizeContact,
  normalizeAddressBook,
  normalizeContact
} from './transformer/ContactsTransformer'

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
  const data: DavAddressBooksResponse = await response.json()

  const books = data._embedded?.['dav:addressbook'] ?? []
  return books.map(normalizeAddressBook)
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
  const data: DavContactsResponse = await response.json()

  const items = data._embedded?.['dav:item'] ?? []
  return items.map(normalizeContact)
}

export async function saveContact(
  userId: string,
  bookId: string,
  contact: Contact
): Promise<void> {
  await davApi.put(`addressbooks/${userId}/${bookId}/${contact.id}.vcf`, {
    headers: { 'Content-Type': 'application/vcard+json' },
    json: denormalizeContact(contact)
  })
}

export async function deleteContact(
  userId: string,
  bookId: string,
  contactId: string
): Promise<void> {
  await davApi.delete(`addressbooks/${userId}/${bookId}/${contactId}.vcf`)
}
