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

  it('keeps the stored value of an untouched phone', () => {
    const source = {
      valueType: 'uri',
      value: 'tel:7042;phone-context=example.com'
    }
    const withPhones: Contact = {
      ...contact,
      phones: [
        { type: 'work', value: '7042', source },
        {
          type: 'home',
          value: '7043',
          source: { ...source, value: 'tel:7043;phone-context=example.com' }
        }
      ]
    }
    const values = makeFormValuesFromContact(withPhones, 'book')
    values.phones[1] = { type: 'home', value: '7044' }

    const saved = makeContactFromForm(values, withPhones)

    expect(saved.phones).toEqual([
      { type: 'work', value: '7042', source },
      { type: 'home', value: '7044' }
    ])
  })
})
