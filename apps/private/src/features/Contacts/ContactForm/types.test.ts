import { Contact } from '@common/features/Contacts/contactsTypes'
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

  it('keeps the components after the seventh of an untouched address', () => {
    const withExtra: Contact = {
      ...contact,
      addresses: [{ ...untypedAddress, extra: ['BP 12'] }]
    }

    const saved = makeContactFromForm(
      makeFormValuesFromContact(withExtra, 'book'),
      withExtra
    )

    expect(saved.addresses?.[0].extra).toEqual(['BP 12'])
  })

  it('keeps the later addresses untouched after a cleared row', () => {
    const values = makeFormValuesFromContact(contact, 'book')
    const cleared = {
      ...values,
      addresses: [{ type: '', value: '' }, values.addresses[1]]
    }

    const saved = makeContactFromForm(cleared, contact)

    expect(saved.addresses).toEqual([{ ...untypedAddress, type: 'work' }])
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
