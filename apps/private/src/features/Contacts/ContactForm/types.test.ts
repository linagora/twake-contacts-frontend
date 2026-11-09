import { Contact } from '@common/features/Contacts/contactsTypes'
import {
  denormalizeContact,
  normalizeContact
} from '@common/features/Contacts/transformer/ContactsTransformer'
import { makeContactFromForm, makeFormValuesFromContact } from './types'

const untypedAddress = {
  type: null,
  poBox: '',
  extended: '',
  street: '9 rue Sans Type',
  locality: '',
  region: '',
  postalCode: '',
  country: ''
}

const contact: Contact = {
  id: 'c1',
  displayName: 'Untyped Addr',
  name: { givenName: 'Untyped', familyName: 'Addr' },
  emails: [],
  addresses: [untypedAddress, { ...untypedAddress, type: 'WORK' }]
}

describe('makeFormValuesFromContact', () => {
  it('keeps an untyped address untyped', () => {
    const values = makeFormValuesFromContact(contact, 'book')

    expect(values.addresses.map(address => address.type)).toEqual(['', 'work'])
  })

  it('gives no type to the empty rows of missing lists', () => {
    const values = makeFormValuesFromContact(
      { ...contact, addresses: undefined, phones: undefined },
      'book'
    )

    expect(values.phones).toEqual([{ type: '', value: '' }])
    expect(values.emails).toEqual([{ type: '', value: '' }])
    expect(values.addresses).toEqual([{ type: '', value: '' }])
  })
})

describe('makeContactFromForm', () => {
  it('does not give a type to an untouched untyped address', () => {
    const values = {
      ...makeFormValuesFromContact(contact, 'book'),
      familyName: 'Addr2'
    }

    const saved = makeContactFromForm(values, contact)

    expect(saved.addresses?.map(address => address.type)).toEqual(['', 'work'])
  })

  it('trims the emails', () => {
    const values = {
      ...makeFormValuesFromContact(contact, 'book'),
      emails: [
        { type: '', value: ' a@example.com' },
        { type: '', value: 'b@example.com ' }
      ]
    }

    const saved = makeContactFromForm(values, contact)

    expect(saved.emails.map(email => email.value)).toEqual([
      'a@example.com',
      'b@example.com'
    ])
  })
})

describe('saving an unchanged contact', () => {
  it('keeps the UID of the card', () => {
    const uid = 'urn:uuid:6f9e1d20-1c55-4b7a-8e42-77c1f3a0d9e4'
    const read = normalizeContact({
      _links: { self: { href: '/addressbooks/u/contacts/0f8b7a6c.vcf' } },
      data: [
        'vcard',
        [
          ['version', {}, 'text', '4.0'],
          ['uid', {}, 'uri', uid],
          ['fn', {}, 'text', 'Jane Doe'],
          ['n', {}, 'text', ['Doe', 'Jane', '', '', '']]
        ]
      ]
    })

    const saved = denormalizeContact(
      makeContactFromForm(makeFormValuesFromContact(read, 'contacts'), read)
    )

    expect(saved[1].filter(prop => prop[0] === 'uid')).toEqual([
      ['uid', {}, 'uri', uid]
    ])
  })
})
