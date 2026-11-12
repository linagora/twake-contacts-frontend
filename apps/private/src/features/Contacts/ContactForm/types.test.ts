import { Contact } from '@common/features/Contacts/contactsTypes'
import {
  JCalParams,
  JCalProperty,
  JCalValue
} from '@common/features/Contacts/davTypes'
import {
  denormalizeContact,
  normalizeContact
} from '@common/features/Contacts/transformer/ContactsTransformer'
import {
  ContactFormValues,
  makeContactFromForm,
  makeFormValuesFromContact
} from './types'

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
    phones: [
      {
        type: 'work',
        value: '+49-30-1234',
        source: { valueType: 'uri', value: 'tel:+49-30-1234' }
      }
    ]
  }

  it('keeps the value type of an unchanged phone', () => {
    const values = makeFormValuesFromContact(uriPhoneContact, 'book')

    const saved = makeContactFromForm(values, uriPhoneContact)

    expect(saved.phones).toEqual([
      {
        type: 'work',
        value: '+49-30-1234',
        source: { valueType: 'uri', value: 'tel:+49-30-1234' }
      }
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
    values.phones[1] = { ...values.phones[1], value: '7044' }

    const saved = makeContactFromForm(values, withPhones)

    expect(saved.phones).toEqual([
      { type: 'work', value: '7042', source },
      { type: 'home', value: '7044' }
    ])
  })

  it('keeps each phone its own stored value when numbers read the same', () => {
    const atWork = {
      valueType: 'uri',
      value: 'tel:7042;phone-context=work.com'
    }
    const atHome = {
      valueType: 'uri',
      value: 'tel:7042;phone-context=home.com'
    }
    const withPhones: Contact = {
      ...contact,
      phones: [
        { type: 'work', value: '7042', source: atWork },
        { type: 'home', value: '7042', source: atHome }
      ]
    }
    const values = {
      ...makeFormValuesFromContact(withPhones, 'book'),
      familyName: 'Addr2'
    }

    const saved = makeContactFromForm(values, withPhones)

    expect(saved.phones?.map(phone => phone.source)).toEqual([atWork, atHome])
  })

  it('does not hand a removed phone stored value to another row', () => {
    const source = { valueType: 'uri', value: 'tel:7042;phone-context=a.com' }
    const withPhones: Contact = {
      ...contact,
      phones: [
        { type: 'work', value: '7042', source },
        { type: 'home', value: '0600000000' }
      ]
    }
    const values = makeFormValuesFromContact(withPhones, 'book')
    values.phones = [{ ...values.phones[1], value: '7042' }]

    const saved = makeContactFromForm(values, withPhones)

    expect(saved.phones).toEqual([{ type: 'home', value: '7042' }])
  })

  describe('parameters', () => {
    const readCard = (properties: JCalProperty[]): Contact =>
      normalizeContact({
        _links: { self: { href: '/addressbooks/u/contacts/c1.vcf' } },
        data: ['vcard', [['uid', {}, 'text', 'c1'], ...properties]]
      })

    const save = (
      read: Contact,
      edit: (
        values: ReturnType<typeof makeFormValuesFromContact>
      ) => void = () => undefined
    ): JCalProperty[] => {
      const values = makeFormValuesFromContact(read, 'contacts')
      edit(values)
      return denormalizeContact(makeContactFromForm(values, read))[1]
    }

    const paramsOf = (
      saved: JCalProperty[],
      name: string
    ): JCalParams | undefined => saved.find(prop => prop[0] === name)?.[1]

    it('keeps the parameters of FN and N', () => {
      const fn: JCalProperty = [
        'fn',
        { language: 'nl' },
        'text',
        'Anna van der Berg'
      ]
      const n: JCalProperty = [
        'n',
        { 'sort-as': 'Berg,Anna' },
        'text',
        ['van der Berg', 'Anna', '', '', '']
      ]

      const saved = save(readCard([fn, n]))

      expect(saved).toContainEqual(fn)
      expect(saved).toContainEqual(n)
    })

    it('keeps PREF, the TYPE list, the group and the LABEL', () => {
      const saved = save(
        readCard([
          [
            'email',
            { group: 'item1', type: ['INTERNET', 'WORK'], pref: '1' },
            'text',
            'jane@acme.example'
          ],
          ['x-ablabel', { group: 'item1' }, 'unknown', '_$!<Other>!$_'],
          ['tel', { type: ['CELL', 'VOICE'] }, 'text', '+33 6 12 34 56 78'],
          [
            'adr',
            { type: 'WORK', label: '1 Way\nRedmond' },
            'text',
            ['', '', '1 Way', 'Redmond', '', '98052', 'USA']
          ],
          ['bday', { 'x-apple-omit-year': '1604' }, 'date', '1604-04-12'],
          ['url', { type: 'work' }, 'uri', 'https://contoso.example/'],
          ['org', { 'sort-as': 'Initech' }, 'text', ['Initech', 'IT']],
          ['title', { language: 'en' }, 'text', 'Engineer'],
          ['note', { 'x-custom': 'a' }, 'text', 'Met at FOSDEM']
        ])
      )

      expect(paramsOf(saved, 'email')).toEqual({
        group: 'item1',
        type: ['INTERNET', 'WORK'],
        pref: '1'
      })
      expect(paramsOf(saved, 'x-ablabel')).toEqual({ group: 'item1' })
      expect(paramsOf(saved, 'tel')?.type).toEqual(['CELL', 'VOICE'])
      expect(paramsOf(saved, 'adr')?.label).toBe('1 Way\nRedmond')
      expect(paramsOf(saved, 'bday')?.['x-apple-omit-year']).toBe('1604')
      expect(paramsOf(saved, 'url')?.type).toBe('work')
      expect(paramsOf(saved, 'org')).toEqual({ 'sort-as': 'Initech' })
      expect(paramsOf(saved, 'title')).toEqual({ language: 'en' })
      expect(paramsOf(saved, 'note')).toEqual({ 'x-custom': 'a' })
    })

    it('replaces only the home, work, cell or other TYPE of a changed type', () => {
      const saved = save(
        readCard([
          [
            'email',
            { type: ['WORK', 'INTERNET', 'pref'], pref: '1' },
            'text',
            'jane@acme.example'
          ]
        ]),
        values => {
          values.emails[0] = { ...values.emails[0], type: 'home' }
        }
      )

      expect(paramsOf(saved, 'email')).toEqual({
        type: ['home', 'INTERNET', 'pref'],
        pref: '1'
      })
    })

    it('drops the SORT-AS of a renamed contact and the LABEL of an edited address', () => {
      const saved = save(
        readCard([
          ['fn', { language: 'nl' }, 'text', 'Anna van der Berg'],
          [
            'n',
            { 'sort-as': 'Berg,Anna', language: 'nl' },
            'text',
            ['van der Berg', 'Anna', '', '', '']
          ],
          [
            'adr',
            { type: 'WORK', label: '1 Way\nRedmond', pref: '1' },
            'text',
            ['', '', '1 Way', 'Redmond', '', '98052', 'USA']
          ]
        ]),
        values => {
          values.familyName = 'de Vries'
          values.addresses[0] = { ...values.addresses[0], value: '2 Way' }
        }
      )

      expect(paramsOf(saved, 'n')).toEqual({ language: 'nl' })
      expect(paramsOf(saved, 'adr')).toEqual({ type: 'WORK', pref: '1' })
    })

    it('drops the label of a deleted grouped property', () => {
      const saved = save(
        readCard([
          ['email', { type: 'WORK' }, 'text', 'jane@acme.example'],
          ['email', { group: 'item1' }, 'text', 'jane@other.example'],
          ['x-ablabel', { group: 'item1' }, 'unknown', '_$!<Other>!$_']
        ]),
        values => {
          values.emails = values.emails.slice(0, 1)
        }
      )

      expect(saved.map(prop => prop[0])).not.toContain('x-ablabel')
    })
  })
})

describe('saving multi-valued structured components', () => {
  const adr = ['', '', ['123 Main St', 'Apt 4'], 'Paris', '', '75002', 'France']
  const org = [['Acme', 'Acme SAS'], 'Sales']
  const n = [['García', 'López'], ['Jean', 'Paul'], '', '', '']
  const read = normalizeContact({
    _links: { self: { href: '/addressbooks/u/contacts/c1.vcf' } },
    data: [
      'vcard',
      [
        ['uid', {}, 'text', 'c1'],
        ['fn', {}, 'text', 'Jean Paul García López'],
        ['n', {}, 'text', n],
        ['adr', { type: 'work' }, 'text', adr],
        ['org', {}, 'text', org]
      ]
    ]
  })
  const save = (values: ContactFormValues): JCalProperty[] =>
    denormalizeContact(makeContactFromForm(values, read))[1]
  const valueOf = (
    saved: JCalProperty[],
    name: string
  ): JCalValue | undefined => saved.find(prop => prop[0] === name)?.[3]

  it('keeps multi-valued ADR, ORG and N components on an unchanged save', () => {
    const saved = save(makeFormValuesFromContact(read, 'contacts'))

    expect(valueOf(saved, 'adr')).toEqual(adr)
    expect(valueOf(saved, 'org')).toEqual(org)
    expect(valueOf(saved, 'n')).toEqual(n)
  })

  it('keeps both the parameters and the multi-valued components of an unchanged ADR', () => {
    const labelled: JCalProperty = [
      'adr',
      { type: ['WORK', 'pref'], label: '123 Main St\nApt 4' },
      'text',
      adr
    ]
    const card = normalizeContact({
      _links: { self: { href: '/addressbooks/u/contacts/c1.vcf' } },
      data: ['vcard', [['uid', {}, 'text', 'c1'], labelled]]
    })

    const saved = denormalizeContact(
      makeContactFromForm(makeFormValuesFromContact(card, 'contacts'), card)
    )[1]

    expect(saved).toContainEqual(labelled)
  })

  it('writes an edited name component as typed, keeping the unchanged one', () => {
    const values = makeFormValuesFromContact(read, 'contacts')

    const saved = save({ ...values, givenName: 'Jean-Paul' })

    expect(valueOf(saved, 'n')).toEqual([
      ['García', 'López'],
      'Jean-Paul',
      '',
      '',
      ''
    ])
  })

  it('writes an edited address as free text', () => {
    const values = makeFormValuesFromContact(read, 'contacts')

    const saved = save({
      ...values,
      addresses: [{ type: 'work', value: '1 rue de la Paix' }]
    })

    expect(valueOf(saved, 'adr')).toEqual([
      '',
      '',
      '1 rue de la Paix',
      '',
      '',
      '',
      ''
    ])
  })
})
