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

  describe('Matrix profiles', () => {
    const socialProfiles = [
      { type: 'matrix', value: '@momo:matrix.example' },
      { type: 'twitter', value: 'momo' },
      { type: 'MATRIX', value: '@a:m.example' }
    ]
    const withProfiles: Contact = { ...contact, socialProfiles }

    it('keeps every Matrix profile of an unchanged contact', () => {
      const saved = makeContactFromForm(
        makeFormValuesFromContact(withProfiles, 'book'),
        withProfiles
      )

      expect(saved.socialProfiles).toEqual(socialProfiles)
    })

    it('updates only the shown Matrix profile, in place', () => {
      const values = {
        ...makeFormValuesFromContact(withProfiles, 'book'),
        matrixId: ' @new:matrix.example '
      }

      const saved = makeContactFromForm(values, withProfiles)

      expect(saved.socialProfiles).toEqual([
        { type: 'matrix', value: '@new:matrix.example' },
        { type: 'twitter', value: 'momo' },
        { type: 'MATRIX', value: '@a:m.example' }
      ])
    })

    it('removes only the shown Matrix profile when emptied', () => {
      const values = {
        ...makeFormValuesFromContact(withProfiles, 'book'),
        matrixId: ''
      }

      const saved = makeContactFromForm(values, withProfiles)

      expect(saved.socialProfiles).toEqual([
        { type: 'twitter', value: 'momo' },
        { type: 'MATRIX', value: '@a:m.example' }
      ])
    })

    it('appends a Matrix profile when the contact had none', () => {
      const values = {
        ...makeFormValuesFromContact(contact, 'book'),
        matrixId: '@new:matrix.example'
      }

      const saved = makeContactFromForm(values, contact)

      expect(saved.socialProfiles).toEqual([
        { type: 'matrix', value: '@new:matrix.example' }
      ])
    })
  })

  const uriPhoneContact: Contact = {
    ...contact,
    phones: [{ type: 'work', value: '+49-30-1234', valueType: 'uri' }]
  }

  it('keeps the value type of an unchanged phone', () => {
    const values = makeFormValuesFromContact(uriPhoneContact, 'book')

    const saved = makeContactFromForm(values, uriPhoneContact)

    expect(saved.phones).toEqual([
      { type: 'work', value: '+49-30-1234', valueType: 'uri' }
    ])
  })

  it('does not keep the value type of an edited phone', () => {
    const values = {
      ...makeFormValuesFromContact(uriPhoneContact, 'book'),
      phones: [{ type: 'work', value: '+49 30 9999' }]
    }

    const saved = makeContactFromForm(values, uriPhoneContact)

    expect(saved.phones).toEqual([{ type: 'work', value: '+49 30 9999' }])
  })
})
