/**
 * @vitest-environment jsdom
 */
import {
  denormalizeContact,
  getCardProperty,
  normalizeAddressBook,
  normalizeContact
} from './transformer/ContactsTransformer'
import { api } from '@common/utils/apiUtils'
import { fetchUserById } from '@common/features/User/UserDao'
import {
  copyContact,
  deleteContact,
  exportAddressBook,
  exportContact,
  fetchAddressBooks,
  fetchAddressBookDetails,
  fetchContact,
  fetchContactsPage,
  fetchSubscribableAddressBooks,
  moveContact,
  resolveAddressBookMember,
  searchContacts,
  saveContact,
  subscribeToAddressBook
} from './ContactsDao'
import { classifyAddressBook } from './addressBookModel'
import { formatAddress } from './contactsUtils'
import {
  AddressBookAccessLevel,
  DavAddressBookItem,
  DavContactItem,
  DavContactsResponse,
  JCalCard,
  JCalProperty,
  JCalValue
} from './davTypes'
import { AddressBook, RawAddressBook } from './contactsTypes'
import { DEFAULT_CONTACT_SORT } from './constants'
import { matchPath } from 'react-router'

vi.mock('@common/utils/apiUtils', () => ({
  api: Object.assign(vi.fn(), {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn()
  })
}))
vi.mock('@common/features/User/UserDao', () => ({ fetchUserById: vi.fn() }))

/**
 * Synthetic data mirroring the shape of a real
 * `GET /addressbooks/<userId>/collected.json` response. Keeps the three
 * variations the server emits: `fn` last, `fn` first, and a card whose `fn`
 * is just the email address.
 */
const response: DavContactsResponse = {
  _links: { self: { href: '/addressbooks/user-1/collected.json' } },
  'dav:syncToken': 47,
  _embedded: {
    'dav:item': [
      {
        _links: {
          self: { href: '/addressbooks/user-1/collected/contact-1.vcf' }
        },
        etag: '"00000000000000000000000000000001"',
        data: [
          'vcard',
          [
            ['version', {}, 'text', '4.0'],
            ['uid', {}, 'text', 'contact-1'],
            ['email', { type: 'work' }, 'text', 'jdoe@twake.app'],
            ['fn', {}, 'text', 'jdoe@twake.app']
          ]
        ]
      },
      {
        _links: {
          self: { href: '/addressbooks/user-1/collected/contact-2.vcf' }
        },
        etag: '"00000000000000000000000000000002"',
        data: [
          'vcard',
          [
            ['version', {}, 'text', '4.0'],
            ['fn', {}, 'text', 'Jane Roe'],
            ['uid', {}, 'text', 'contact-2'],
            ['email', { type: 'work' }, 'text', 'jane.roe@example.org']
          ]
        ]
      }
    ]
  }
}

const [collectedItem, namedItem] = response._embedded?.['dav:item'] ?? []

describe('normalizeContact', () => {
  it('reads the id from the self link, not from the uid property', () => {
    expect(normalizeContact(collectedItem).id).toBe('contact-1')
  })

  it('reads properties by name whatever their order in the card', () => {
    expect(normalizeContact(namedItem)).toEqual(
      expect.objectContaining({
        id: 'contact-2',
        displayName: 'Jane Roe',
        emails: [
          {
            type: 'work',
            value: 'jane.roe@example.org',
            params: { type: 'work' }
          }
        ]
      })
    )
  })

  it('normalizes a contact whose href is not a string', () => {
    const item: DavContactItem = {
      _links: { self: { href: 12 } },
      data: ['vcard', [['fn', {}, 'text', 'Jane Doe']]]
    }
    expect(normalizeContact(item)).toEqual(
      expect.objectContaining({ id: '', displayName: 'Jane Doe' })
    )
  })

  it('pads an N with fewer than two components', () => {
    const contact = normalizeContact({
      _links: { self: { href: '/addressbooks/u1/contacts/c1.vcf' } },
      data: [
        'vcard',
        [
          ['fn', {}, 'text', 'Doe'],
          ['n', {}, 'text', ['Doe']]
        ]
      ]
    })
    expect(contact.name).toEqual({ familyName: 'Doe', givenName: '' })
    expect(JSON.stringify(denormalizeContact(contact))).not.toContain('null')
  })

  it('pads an empty N to empty strings', () => {
    const contact = normalizeContact({
      _links: { self: { href: '/addressbooks/u1/contacts/c1.vcf' } },
      data: [
        'vcard',
        [
          ['fn', {}, 'text', 'Doe'],
          ['n', {}, 'text', []]
        ]
      ]
    })
    expect(contact.name).toEqual({ familyName: '', givenName: '' })
  })

  it.each([
    ['TEL:+1-201-555-0123', '+1-201-555-0123'],
    ['tel:+49-30-1234', '+49-30-1234'],
    ['tel:7042;phone-context=example.com', '7042'],
    ['tel:+1-201-555-0123;ext=1234', '+1-201-555-0123;ext=1234'],
    ['tel:%2B3312', '+3312'],
    ['tel:%E0%A4%A', '%E0%A4%A'],
    ['  tel:+33 1 23  ', '+33 1 23'],
    ['(650) 555-0100', '(650) 555-0100'],
    ['50%2B', '50%2B']
  ])('reads the number of %j', (raw, expected) => {
    const contact = normalizeContact({
      _links: { self: { href: '/addressbooks/u/b/c.vcf' } },
      data: ['vcard', [['tel', {}, 'uri', raw]]]
    })
    expect(contact.phones?.[0]?.value).toBe(expected)
  })

  it('keeps the email as display name for a collected contact', () => {
    expect(normalizeContact(collectedItem).displayName).toBe('jdoe@twake.app')
  })

  it('falls back to the id when the card carries no fn', () => {
    const withoutFn: DavContactItem = {
      ...collectedItem,
      data: ['vcard', [['version', {}, 'text', '4.0']]]
    }
    expect(normalizeContact(withoutFn).displayName).toBe('contact-1')
  })

  it('does not include optional fields when absent', () => {
    const minimal: DavContactItem = {
      ...collectedItem,
      data: ['vcard', [['version', {}, 'text', '4.0']]]
    }
    const contact = normalizeContact(minimal)
    expect(contact).toEqual({
      id: 'contact-1',
      displayName: 'contact-1',
      emails: []
    })
    expect(contact).not.toHaveProperty('phones')
    expect(contact).not.toHaveProperty('addresses')
    expect(contact).not.toHaveProperty('name')
    expect(contact).not.toHaveProperty('nicknames')
  })

  it('reads a tel property with uri value type', () => {
    const withTel: DavContactItem = {
      ...collectedItem,
      data: [
        'vcard',
        [
          ['version', {}, 'text', '4.0'],
          ['tel', { type: 'Work' }, 'uri', '0788668833']
        ]
      ]
    }
    expect(normalizeContact(withTel).phones).toEqual([
      { type: 'Work', value: '0788668833', params: { type: 'Work' } }
    ])
  })

  it('strips the tel: prefix from a tel uri', () => {
    const withTelUri: DavContactItem = {
      ...collectedItem,
      data: [
        'vcard',
        [
          ['version', {}, 'text', '4.0'],
          ['tel', { type: 'Work' }, 'uri', 'tel:0788668833']
        ]
      ]
    }
    expect(normalizeContact(withTelUri).phones).toEqual([
      {
        type: 'Work',
        value: '0788668833',
        params: { type: 'Work' },
        source: { valueType: 'uri', value: 'tel:0788668833' }
      }
    ])
  })

  it('reads multiple emails', () => {
    const withEmails: DavContactItem = {
      ...collectedItem,
      data: [
        'vcard',
        [
          ['version', {}, 'text', '4.0'],
          ['email', { type: 'Work' }, 'text', 'work@example.org'],
          ['email', { type: 'Home' }, 'text', 'home@example.org']
        ]
      ]
    }
    expect(normalizeContact(withEmails).emails).toEqual([
      { type: 'Work', value: 'work@example.org', params: { type: 'Work' } },
      { type: 'Home', value: 'home@example.org', params: { type: 'Home' } }
    ])
  })

  it('reads multiple phones', () => {
    const withPhones: DavContactItem = {
      ...collectedItem,
      data: [
        'vcard',
        [
          ['version', {}, 'text', '4.0'],
          ['tel', { type: 'Work' }, 'uri', '0788668833'],
          ['tel', { type: 'Home' }, 'uri', '0788668844']
        ]
      ]
    }
    expect(normalizeContact(withPhones).phones).toEqual([
      { type: 'Work', value: '0788668833', params: { type: 'Work' } },
      { type: 'Home', value: '0788668844', params: { type: 'Home' } }
    ])
  })

  it('keeps every value of a multi-valued EMAIL and TEL', () => {
    const contact = normalizeContact({
      ...collectedItem,
      data: [
        'vcard',
        [
          ['email', {}, 'text', 'a@x.example', 'f+tag@x.example'],
          ['email', {}, 'integer', 12],
          ['tel', { type: 'Work' }, 'text', '112', '(650) 555-0100'],
          ['tel', {}, 'integer', 12],
          ['tel', {}, 'integer', true]
        ]
      ]
    })
    expect(contact.emails).toEqual([
      { type: null, value: 'a@x.example' },
      { type: null, value: 'f+tag@x.example' },
      { type: null, value: '12' }
    ])
    expect(contact.phones).toEqual([
      { type: 'Work', value: '112', params: { type: 'Work' } },
      { type: 'Work', value: '(650) 555-0100', params: { type: 'Work' } },
      { type: null, value: '12' }
    ])
  })

  it('reads addresses', () => {
    const withAdr: DavContactItem = {
      ...collectedItem,
      data: [
        'vcard',
        [
          ['version', {}, 'text', '4.0'],
          [
            'adr',
            { type: 'Work' },
            'text',
            [
              '',
              'Building B',
              '10 Avenue des Champs',
              'Paris',
              '',
              '75008',
              'France'
            ]
          ]
        ]
      ]
    }
    expect(normalizeContact(withAdr).addresses).toEqual([
      {
        type: 'Work',
        poBox: '',
        extended: 'Building B',
        street: '10 Avenue des Champs',
        locality: 'Paris',
        region: '',
        postalCode: '75008',
        country: 'France',
        params: { type: 'Work' }
      }
    ])
  })

  it('reads addresses with missing trailing components', () => {
    const withShortAdr: DavContactItem = {
      ...collectedItem,
      data: [
        'vcard',
        [
          ['version', {}, 'text', '4.0'],
          ['adr', {}, 'text', ['', '', '1 Main St', 'Springfield']]
        ]
      ]
    }
    expect(normalizeContact(withShortAdr).addresses).toEqual([
      {
        type: null,
        poBox: '',
        extended: '',
        street: '1 Main St',
        locality: 'Springfield',
        region: '',
        postalCode: '',
        country: ''
      }
    ])
  })

  it('keeps an ADR written as a string as the street', () => {
    const contact = normalizeContact({
      ...collectedItem,
      data: [
        'vcard',
        [
          ['version', {}, 'text', '4.0'],
          ['adr', {}, 'text', '1 rue de la Paix']
        ]
      ]
    })
    const address = {
      type: null,
      poBox: '',
      extended: '',
      street: '1 rue de la Paix',
      locality: '',
      region: '',
      postalCode: '',
      country: ''
    }
    expect(contact.addresses).toEqual([address])
    expect(formatAddress(address)).toBe('1 rue de la Paix')
  })

  it('ignores an ADR written as a blank string', () => {
    const contact = normalizeContact({
      ...collectedItem,
      data: [
        'vcard',
        [
          ['version', {}, 'text', '4.0'],
          ['adr', {}, 'text', '   ']
        ]
      ]
    })
    expect(contact.addresses ?? []).toEqual([])
  })

  it('does not hide ADR components after the seventh', () => {
    const contact = normalizeContact({
      _links: { self: { href: '/addressbooks/u/b/c.vcf' } },
      data: [
        'vcard',
        [
          [
            'adr',
            {},
            'text',
            ['', '', '1 rue', 'Lyon', '', '69001', 'France', 'BP 12']
          ]
        ]
      ]
    })
    const [address] = contact.addresses ?? []
    expect(address.extra).toEqual(['BP 12'])
    expect(formatAddress(address)).toContain('BP 12')
  })

  it('shows the label of an ADR without components', () => {
    const contact = normalizeContact({
      _links: { self: { href: '/addressbooks/u/b/c.vcf' } },
      data: [
        'vcard',
        [
          [
            'adr',
            { type: 'HOME', label: '1 Infinite Loop\nCupertino' },
            'text',
            ['', '', '', '', '', '', '']
          ]
        ]
      ]
    })
    const [address] = contact.addresses ?? []
    expect(address.label).toBe('1 Infinite Loop\nCupertino')
    expect(formatAddress(address)).toBe('1 Infinite Loop, Cupertino')
  })

  it('shows the components of an ADR rather than its label', () => {
    const contact = normalizeContact({
      _links: { self: { href: '/addressbooks/u/b/c.vcf' } },
      data: [
        'vcard',
        [['adr', { label: 'Label text' }, 'text', ['', '', '1 rue', 'Lyon']]]
      ]
    })
    const [address] = contact.addresses ?? []
    expect(formatAddress(address)).toBe('1 rue, Lyon')
  })

  it('ignores an ADR holding neither components nor label', () => {
    const contact = normalizeContact({
      _links: { self: { href: '/addressbooks/u/b/c.vcf' } },
      data: [
        'vcard',
        [
          ['adr', { type: 'HOME', label: ' ' }, 'text', ['', '', '', '']],
          ['adr', {}, 'text', ['', '', '1 rue', 'Lyon']]
        ]
      ]
    })
    expect(contact.addresses?.map(formatAddress)).toEqual(['1 rue, Lyon'])
  })

  it('writes the label of an ADR back', () => {
    const adr: JCalProperty = [
      'adr',
      { type: 'HOME', label: '1 Infinite Loop\nCupertino' },
      'text',
      ['', '', '', '', '', '', '']
    ]
    const contact = normalizeContact({
      _links: { self: { href: '/addressbooks/u/b/c.vcf' } },
      data: ['vcard', [adr]]
    })
    expect(denormalizeContact(contact)[1]).toContainEqual(adr)
  })

  it('shows an address whose only content is after the seventh component', () => {
    const contact = normalizeContact({
      _links: { self: { href: '/addressbooks/u/b/c.vcf' } },
      data: [
        'vcard',
        [['adr', {}, 'text', ['', '', '', '', '', '', '', 'Paris']]]
      ]
    })
    const [address] = contact.addresses ?? []
    expect(formatAddress(address)).toBe('Paris')
  })

  it('reads social profiles', () => {
    const withSocial: DavContactItem = {
      ...collectedItem,
      data: [
        'vcard',
        [
          ['version', {}, 'text', '4.0'],
          ['socialprofile', { type: 'Skype' }, 'unknown', 'testskype'],
          ['socialprofile', { type: 'Twitter' }, 'unknown', 'testtwitter']
        ]
      ]
    }
    expect(normalizeContact(withSocial).socialProfiles).toEqual([
      { type: 'Skype', value: 'testskype', params: { type: 'Skype' } },
      { type: 'Twitter', value: 'testtwitter', params: { type: 'Twitter' } }
    ])
  })

  it('reads urls', () => {
    const withUrls: DavContactItem = {
      ...collectedItem,
      data: [
        'vcard',
        [
          ['version', {}, 'text', '4.0'],
          ['url', {}, 'uri', 'https://example.org'],
          ['url', {}, 'uri', 'https://example.com']
        ]
      ]
    }
    expect(normalizeContact(withUrls).urls).toEqual([
      { value: 'https://example.org' },
      { value: 'https://example.com' }
    ])
  })

  it('reads org', () => {
    const withOrg: DavContactItem = {
      ...collectedItem,
      data: [
        'vcard',
        [
          ['version', {}, 'text', '4.0'],
          ['org', {}, 'text', ['Acme', 'Sales']]
        ]
      ]
    }
    expect(normalizeContact(withOrg).org).toEqual({
      name: 'Acme',
      units: ['Sales']
    })
  })

  it('strips mailto: prefix from email addresses', () => {
    const withMailto: DavContactItem = {
      ...collectedItem,
      data: [
        'vcard',
        [
          ['version', {}, 'text', '4.0'],
          ['email', { type: 'Work' }, 'text', 'mailto:test@example.org']
        ]
      ]
    }
    expect(normalizeContact(withMailto).emails).toEqual([
      { type: 'Work', value: 'test@example.org', params: { type: 'Work' } }
    ])
  })

  it('reads array components and ignores objects', () => {
    const contact = normalizeContact({
      _links: { self: { href: '/addressbooks/u/b/c.vcf' } },
      data: [
        'vcard',
        [
          ['adr', {}, 'text', ['', '', ['Line 1', 'Line 2'], { a: 1 }]],
          ['org', {}, 'text', ['Acme', ['A', 'B']]]
        ]
      ]
    } as unknown as DavContactItem)
    expect(contact.addresses?.[0].street).toBe('Line 1 Line 2')
    expect(contact.addresses?.[0].locality).toBe('')
    expect(contact.org).toMatchObject({ name: 'Acme', units: ['A B'] })
  })

  it('ignores an object org component', () => {
    const contact = normalizeContact({
      _links: { self: { href: '/addressbooks/u/b/c.vcf' } },
      data: ['vcard', [['org', {}, 'text', [{ a: 1 }]]]]
    } as unknown as DavContactItem)
    expect(contact.org).toEqual({ name: '', units: [] })
  })

  it('reads numeric components as text', () => {
    const contact = normalizeContact({
      ...collectedItem,
      data: ['vcard', [['adr', {}, 'text', ['', '', '', '', '', 75001, '']]]]
    })
    expect(contact.addresses?.[0].postalCode).toBe('75001')
  })

  it('reads array name components', () => {
    const contact = normalizeContact({
      ...collectedItem,
      data: [
        'vcard',
        [['n', {}, 'text', [['van der', 'Berg'], 'Jan', '', '', '']]]
      ]
    })
    expect(contact.name).toMatchObject({
      familyName: 'van der Berg',
      givenName: 'Jan'
    })
  })

  it('normalizes a deeply nested structured component without overflowing', () => {
    let deep: JCalValue = 'x'
    for (let i = 0; i < 20000; i++) deep = [deep]
    expect(() =>
      normalizeContact({
        _links: { self: { href: '/addressbooks/u1/contacts/c1.vcf' } },
        data: ['vcard', [['n', {}, 'text', [deep]]]]
      })
    ).not.toThrow()
  })

  it('keeps a numeric BDAY', () => {
    const contact = normalizeContact({
      _links: { self: { href: '/addressbooks/u/b/c.vcf' } },
      data: ['vcard', [['bday', {}, 'date', 19850412]]]
    })
    expect(contact.birthday).toBe('19850412')
    expect(contact.passthroughProps).toBeUndefined()
  })

  it('passes an unreadable BDAY through so that saving keeps it', () => {
    const bday = ['bday', {}, 'date', { year: 1985 }] as unknown as JCalProperty
    const contact = normalizeContact({
      _links: { self: { href: '/addressbooks/u/b/c.vcf' } },
      data: ['vcard', [bday]]
    })
    expect(contact.birthday).toBeUndefined()
    expect(denormalizeContact(contact)[1]).toContainEqual(bday)
  })
})

describe('getCardProperty', () => {
  it('returns null for an absent property', () => {
    expect(getCardProperty(collectedItem.data, 'tel')).toBeNull()
  })

  it('returns null for a structured property rather than an array', () => {
    const card: JCalCard = [
      'vcard',
      [['n', {}, 'text', ['Roe', 'Jane', '', '', '']]]
    ]
    expect(getCardProperty(card, 'n')).toBeNull()
  })
})

const telProperties = (card: JCalCard): JCalProperty[] =>
  card[1].filter(prop => prop[0] === 'tel')

describe('denormalizeContact', () => {
  it('builds the jCal card the DAV server expects', () => {
    const card = denormalizeContact({
      id: 'c-1',
      displayName: 'Alice Roche',
      name: { givenName: 'Alice', familyName: 'Roche' },
      categories: ['Design'],
      emails: [{ type: 'work', value: 'alice@twake.app' }],
      phones: [{ type: 'cell', value: '+336' }],
      socialProfiles: [{ type: 'matrix', value: '@alice:twake.app' }]
    })
    expect(card).toEqual([
      'vcard',
      [
        ['version', {}, 'text', '4.0'],
        ['uid', {}, 'text', 'c-1'],
        ['fn', {}, 'text', 'Alice Roche'],
        ['n', {}, 'text', ['Roche', 'Alice', '', '', '']],
        ['categories', {}, 'text', 'Design'],
        ['email', { type: 'work' }, 'text', 'alice@twake.app'],
        ['tel', { type: 'cell' }, 'text', '+336'],
        ['socialprofile', { type: 'matrix' }, 'text', '@alice:twake.app']
      ]
    ])
  })

  it('writes back the UID of a card whose file name differs from it', () => {
    const contact = normalizeContact({
      _links: {
        self: { href: '/addressbooks/u/contacts/0f8b7a6c.vcf' }
      },
      data: [
        'vcard',
        [
          ['version', {}, 'text', '4.0'],
          ['uid', {}, 'text', '6F9E1D20-1C55-4B7A-8E42-77C1F3A0D9E4'],
          ['fn', {}, 'text', 'Jane Doe']
        ]
      ]
    })

    expect(contact.id).toBe('0f8b7a6c')
    expect(
      denormalizeContact(contact)[1].filter(prop => prop[0] === 'uid')
    ).toEqual([['uid', {}, 'text', '6F9E1D20-1C55-4B7A-8E42-77C1F3A0D9E4']])
  })

  it('keeps the uri value type of an urn:uuid UID', () => {
    const uid: JCalProperty = [
      'uid',
      {},
      'uri',
      'urn:uuid:0f8b7a6c-1234-4abc-9def-001122334455'
    ]
    const contact = normalizeContact({
      _links: {
        self: {
          href: '/addressbooks/u/contacts/0f8b7a6c-1234-4abc-9def-001122334455.vcf'
        }
      },
      data: ['vcard', [['version', {}, 'text', '4.0'], uid]]
    })

    expect(
      denormalizeContact(contact)[1].filter(prop => prop[0] === 'uid')
    ).toEqual([uid])
  })

  it('writes an unchanged TEL URI back as stored', () => {
    const stored: JCalProperty = [
      'tel',
      { type: 'work' },
      'uri',
      'tel:7042;phone-context=example.com'
    ]
    const contact = normalizeContact({
      ...collectedItem,
      data: ['vcard', [['version', {}, 'text', '4.0'], stored]]
    })

    expect(telProperties(denormalizeContact(contact))).toEqual([stored])
  })

  it('writes the readable number of a changed phone', () => {
    const card = denormalizeContact({
      id: 'c-1',
      displayName: 'Alice Roche',
      emails: [],
      phones: [
        {
          type: 'work',
          value: '7043',
          source: {
            valueType: 'uri',
            value: 'tel:7042;phone-context=example.com'
          }
        }
      ]
    })

    expect(telProperties(card)).toEqual([
      ['tel', { type: 'work' }, 'text', '7043']
    ])
  })

  it('writes every address component back in vCard order', () => {
    const address = {
      type: 'work',
      poBox: 'BP 12',
      extended: 'Building B',
      street: '10 Avenue des Champs',
      locality: 'Paris',
      region: 'IDF',
      postalCode: '75008',
      country: 'France'
    }
    const card = denormalizeContact({
      id: 'c-1',
      displayName: 'Alice Roche',
      emails: [],
      addresses: [address]
    })
    expect(card[1]).toContainEqual([
      'adr',
      { type: 'work' },
      'text',
      [
        'BP 12',
        'Building B',
        '10 Avenue des Champs',
        'Paris',
        'IDF',
        '75008',
        'France'
      ]
    ])
    expect(
      normalizeContact({ data: card, _links: { self: { href: 'c-1.vcf' } } })
        .addresses
    ).toEqual([{ ...address, params: { type: 'work' } }])
  })

  it('writes a text EMAIL back as a bare address', () => {
    const contact = normalizeContact({
      _links: { self: { href: '/addressbooks/u/contacts/c1.vcf' } },
      data: [
        'vcard',
        [
          ['version', {}, 'text', '4.0'],
          ['fn', {}, 'text', 'Jane Doe'],
          ['email', { type: 'home' }, 'text', 'jane@home.example']
        ]
      ]
    })
    const emails = denormalizeContact(contact)[1].filter(p => p[0] === 'email')
    expect(emails).toEqual([
      ['email', { type: 'home' }, 'text', 'jane@home.example']
    ])
  })

  it('writes a mailto: uri EMAIL back as a bare text address', () => {
    const contact = normalizeContact({
      _links: { self: { href: '/addressbooks/u/contacts/c1.vcf' } },
      data: [
        'vcard',
        [
          ['version', {}, 'text', '4.0'],
          ['fn', {}, 'text', 'Jane Doe'],
          ['email', {}, 'uri', 'mailto:u@x.example']
        ]
      ]
    })
    const emails = denormalizeContact(contact)[1].filter(p => p[0] === 'email')
    expect(emails).toEqual([['email', {}, 'text', 'u@x.example']])
  })

  it('writes the components after the seventh back', () => {
    const address = {
      type: null,
      poBox: '',
      extended: '',
      street: '1 rue',
      locality: 'Lyon',
      region: '',
      postalCode: '69001',
      country: 'France',
      extra: ['', '12 rue de la Paix']
    }
    const card = denormalizeContact({
      id: 'c-1',
      displayName: 'Alice Roche',
      emails: [],
      addresses: [address]
    })
    expect(card[1]).toContainEqual([
      'adr',
      {},
      'text',
      ['', '', '1 rue', 'Lyon', '', '69001', 'France', '', '12 rue de la Paix']
    ])
    expect(
      normalizeContact({ data: card, _links: { self: { href: 'c-1.vcf' } } })
        .addresses
    ).toEqual([address])
  })
})

describe('formatAddress', () => {
  it('joins the components in postal order', () => {
    expect(
      formatAddress({
        type: 'work',
        poBox: '',
        extended: 'Building B',
        street: '10 Avenue des Champs',
        locality: 'Paris',
        region: '',
        postalCode: '75008',
        country: 'France'
      })
    ).toBe('Building B, 10 Avenue des Champs, 75008 Paris, France')
  })

  it('skips whitespace-only components', () => {
    expect(
      formatAddress({
        type: null,
        poBox: ' ',
        extended: '',
        street: 'Paris',
        locality: ' ',
        region: '',
        postalCode: '',
        country: ''
      })
    ).toBe('Paris')
  })

  it('trims the components', () => {
    expect(
      formatAddress({
        type: null,
        poBox: '',
        extended: '',
        street: ' 10 Rue de la Paix ',
        locality: 'Paris ',
        region: '\t',
        postalCode: ' 75002',
        country: 'France'
      })
    ).toBe('10 Rue de la Paix, 75002 Paris, France')
  })
})

describe('fetchContact', () => {
  const card: JCalCard = [
    'vcard',
    [
      ['version', {}, 'text', '4.0'],
      ['fn', {}, 'text', 'Search Own'],
      ['email', { type: 'work' }, 'text', 'own@twake.app']
    ]
  ]
  const book = {
    userId: 'bob',
    name: 'My contacts',
    contactsCount: 60,
    acl: [],
    canWrite: true
  }

  beforeEach(() => {
    vi.mocked(api.get).mockReset()
    vi.mocked(api.get).mockReturnValue({
      json: () => Promise.resolve(card)
    } as unknown as ReturnType<typeof api.get>)
  })

  it('reads the single vCard of the contact as jCard', async () => {
    const contact = await fetchContact(
      classifyAddressBook({ ...book, id: 'contacts' }, 'bob'),
      'c60'
    )

    expect(api.get).toHaveBeenCalledWith(
      'dav/addressbooks/bob/contacts/c60.vcf',
      { headers: { Accept: 'application/vcard+json' } }
    )
    expect(contact).toEqual(
      expect.objectContaining({
        id: 'c60',
        displayName: 'Search Own',
        emails: [
          {
            type: 'work',
            value: 'own@twake.app',
            params: { type: 'work' }
          }
        ]
      })
    )
  })

  it('reads a domain member from the domain members book', async () => {
    await fetchContact(
      classifyAddressBook({ ...book, id: 'dab', userId: 'domain-1' }, 'bob'),
      'm1'
    )

    expect(api.get).toHaveBeenCalledWith(
      'dav/addressbooks/domain-1/domain-members/m1.vcf',
      expect.anything()
    )
  })

  it('finds a listed contact from the route built with its id', async () => {
    const listed = normalizeContact({
      _links: { self: { href: '/addressbooks/bob/contacts/a%2Fb.vcf' } },
      data: card
    })
    const match = matchPath(
      '/contacts/:addressBookId/:contactId',
      `/contacts/contacts/${encodeURIComponent(listed.id)}`
    )
    expect(match?.params.contactId).toBe(listed.id)

    const fetched = await fetchContact(
      classifyAddressBook({ ...book, id: 'contacts' }, 'bob'),
      match?.params.contactId ?? ''
    )

    expect(fetched.id).toBe(listed.id)
    expect(api.get).toHaveBeenCalledWith(
      'dav/addressbooks/bob/contacts/a%2Fb.vcf',
      expect.anything()
    )
  })
})

describe('fetchContactsPage', () => {
  const card: JCalCard = ['vcard', [['fn', {}, 'text', 'Alice Roche']]]
  const book: AddressBook = classifyAddressBook(
    {
      id: 'book1',
      userId: 'u1',
      name: 'Book 1',
      contactsCount: null,
      acl: [],
      canWrite: true
    },
    'u1'
  )

  const mockResponse = (response: DavContactsResponse): void => {
    vi.mocked(api.get).mockReturnValue({
      json: () => Promise.resolve(response)
    } as never)
  }

  it('reads the contacts of every address book, domain members included', async () => {
    mockResponse({
      _embedded: {
        'dav:item': [
          {
            _links: { self: { href: '/addressbooks/u1/book1/c1.vcf' } },
            data: card
          },
          {
            _links: {
              self: { href: '/addressbooks/d1/domain-members/c2.vcf' }
            },
            data: card
          }
        ]
      },
      next: 'cursor2'
    })

    const page = await fetchContactsPage(
      'u1',
      null,
      { after: null, sort: DEFAULT_CONTACT_SORT },
      true
    )

    expect(api.get).toHaveBeenCalledWith('dav/contacts/u1.json', {
      searchParams: {
        domainMember: 'true',
        sort: 'fn',
        order: 'asc',
        limit: '50'
      }
    })
    expect(page.entries.map(entry => entry.addressBookId)).toStrictEqual([
      'book1',
      'dab'
    ])
    expect(page.next).toBe('cursor2')
  })

  it('keeps the other contacts of the page when an href is not a string', async () => {
    mockResponse({
      _embedded: {
        'dav:item': [
          {
            _links: { self: { href: '/addressbooks/u1/book1/c1.vcf' } },
            data: card
          },
          { _links: { self: { href: 12 } }, data: card }
        ]
      }
    })

    const page = await fetchContactsPage(
      'u1',
      null,
      { after: null, sort: DEFAULT_CONTACT_SORT },
      false
    )

    expect(
      page.entries.map(entry => [entry.addressBookId, entry.contact.id])
    ).toStrictEqual([
      ['book1', 'c1'],
      ['', '']
    ])
  })

  it('reads the contacts of every address book without the domain members', async () => {
    mockResponse({})

    await fetchContactsPage(
      'u1',
      null,
      { after: null, sort: DEFAULT_CONTACT_SORT },
      false
    )

    expect(api.get).toHaveBeenCalledWith('dav/contacts/u1.json', {
      searchParams: {
        domainMember: 'false',
        sort: 'fn',
        order: 'asc',
        limit: '50'
      }
    })
  })

  it('reads the page of a book after the cursor, in the sort order', async () => {
    mockResponse({})

    const page = await fetchContactsPage(
      'u1',
      book,
      { after: 'cursor1', sort: { by: 'email', order: 'desc' } },
      false
    )

    expect(api.get).toHaveBeenCalledWith('dav/addressbooks/u1/book1.json', {
      searchParams: {
        sort: 'email',
        order: 'desc',
        limit: '50',
        after: 'cursor1'
      }
    })
    expect(page).toStrictEqual({ entries: [], next: null })
  })

  it('reads the domain book from its members', async () => {
    mockResponse({})

    await fetchContactsPage(
      'u1',
      { ...book, id: 'dab', userId: 'd1' },
      { after: null, sort: DEFAULT_CONTACT_SORT },
      false
    )

    expect(api.get).toHaveBeenCalledWith(
      'dav/addressbooks/d1/domain-members.json',
      { searchParams: { userId: 'u1', sort: 'fn', order: 'asc', limit: '50' } }
    )
  })
})

describe('searchContacts', () => {
  const card: JCalCard = ['vcard', [['fn', {}, 'text', 'Jane Doe']]]

  it('skips the items whose href is not a string', async () => {
    vi.mocked(api.post).mockReturnValue({
      json: () =>
        Promise.resolve({
          _embedded: {
            'dav:item': [
              {
                _links: { self: { href: '/addressbooks/u1/book1/c1.vcf' } },
                data: card
              },
              { _links: { self: { href: 12 } }, data: card }
            ]
          }
        })
    } as never)

    const entries = await searchContacts(
      [
        classifyAddressBook(
          {
            id: 'book1',
            userId: 'u1',
            name: 'book1',
            contactsCount: 0,
            acl: [],
            canWrite: true
          },
          'u1'
        )
      ],
      'jane'
    )

    expect(
      entries.map(entry => [entry.addressBookId, entry.contact.id])
    ).toStrictEqual([['book1', 'c1']])
  })
})

describe('fetchAddressBooks', () => {
  const mockBooks = (books: DavAddressBookItem[]): void => {
    vi.mocked(api.get).mockReturnValue({
      json: () => Promise.resolve({ _embedded: { 'dav:addressbook': books } })
    } as never)
  }
  const book = (source: unknown): DavAddressBookItem => ({
    _links: { self: { href: '/addressbooks/u1/b1.json' } },
    'dav:name': 'Book',
    'dav:acl': ['dav:read'],
    'dav:syncToken': 1,
    'openpaas:source': source
  })

  it('reads the owner of a shared book whose source is a HAL object', async () => {
    vi.mocked(fetchUserById).mockResolvedValue({
      firstname: 'Bob',
      lastname: 'Owner'
    } as never)
    mockBooks([
      book({ _links: { self: { href: '/addressbooks/u2/b2.json' } } })
    ])

    const [shared] = await fetchAddressBooks('u1')

    expect(shared).toEqual(
      expect.objectContaining({
        id: 'b1',
        ownerId: 'u2',
        sourceBookId: 'b2',
        ownerDisplayName: 'Bob Owner'
      })
    )
  })

  it.each([[['/addressbooks/u2/b2.json']], [12], [{ foo: 'bar' }]])(
    'keeps a book whose source is malformed: %j',
    async source => {
      mockBooks([book(source)])

      const books = await fetchAddressBooks('u1')

      expect(books).toHaveLength(1)
      expect(books[0].id).toBe('b1')
      expect(books[0].ownerId).toBeUndefined()
    }
  )
})

describe('subscribeToAddressBook', () => {
  const source: RawAddressBook = {
    id: 'public1',
    userId: 'alice-id',
    name: 'Alice Public Read',
    contactsCount: 1,
    acl: ['dav:read'],
    canWrite: false
  }

  const listing = (books: unknown[]): void => {
    vi.mocked(api.get).mockReturnValue({
      json: () => Promise.resolve({ _embedded: { 'dav:addressbook': books } })
    } as unknown as ReturnType<typeof api.get>)
  }

  beforeEach(() => {
    vi.mocked(api.post).mockResolvedValue({} as never)
    vi.mocked(api.get).mockReset()
    listing([])
    vi.mocked(fetchUserById).mockReset()
  })

  it('reads the book back, as Sabre may restore a delegation with its role', async () => {
    vi.spyOn(crypto, 'randomUUID').mockReturnValue('1-2-3-4-5')
    vi.mocked(fetchUserById).mockResolvedValue({
      firstname: 'alice',
      lastname: 'alice'
    } as never)
    listing([
      {
        _links: { self: { href: '/addressbooks/carol-id/1-2-3-4-5.json' } },
        'dav:name': 'Alice Team',
        'dav:acl': ['dav:read', 'dav:write'],
        'dav:share-access': 5,
        'openpaas:source': '/addressbooks/alice-id/team.json'
      }
    ])

    const book = await subscribeToAddressBook('carol-id', source, 'alice')

    expect(book).toEqual(
      expect.objectContaining({
        id: '1-2-3-4-5',
        name: 'Alice Team',
        canWrite: true,
        shareAccess: 5,
        ownerId: 'alice-id',
        sourceBookId: 'team',
        ownerDisplayName: 'alice alice',
        kind: 'delegated'
      })
    )
  })

  it('falls back to a read-only subscription when the book cannot be read back', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.mocked(api.get).mockImplementation(() => {
      throw new Error('network')
    })

    const book = await subscribeToAddressBook('carol-id', source, 'alice')

    expect(book).toEqual(
      expect.objectContaining({
        sourceBookId: 'public1',
        canWrite: false,
        ownerId: 'alice-id',
        kind: 'subscribed'
      })
    )
  })

  it('names the owner from the profile, as when the books are loaded', async () => {
    vi.mocked(fetchUserById).mockResolvedValue({
      firstname: 'alice',
      lastname: 'alice'
    } as never)

    const book = await subscribeToAddressBook('carol-id', source, 'alice')

    expect(fetchUserById).toHaveBeenCalledWith('alice-id')
    expect(book.ownerId).toBe('alice-id')
    expect(book.ownerDisplayName).toBe('alice alice')
  })

  it('keeps the given owner name when the profile cannot be read', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.mocked(fetchUserById).mockRejectedValue(new Error('not found'))

    const book = await subscribeToAddressBook('carol-id', source, 'alice')

    expect(book.ownerDisplayName).toBe('alice')
  })

  it('keeps the given owner name when the profile has no name', async () => {
    vi.mocked(fetchUserById).mockResolvedValue({} as never)

    const book = await subscribeToAddressBook('carol-id', source, 'alice')

    expect(book.ownerDisplayName).toBe('alice')
  })
})

describe('fetchAddressBooks', () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset()
    vi.mocked(api.get).mockReturnValue({
      json: () => Promise.resolve({ _embedded: { 'dav:addressbook': [] } })
    } as unknown as ReturnType<typeof api.get>)
    vi.mocked(api).mockReset()
    vi.mocked(fetchUserById).mockResolvedValue({
      firstname: 'Bob',
      lastname: 'Martin'
    } as never)
  })

  const domainBook = (numberOfContacts: unknown): void => {
    vi.mocked(api).mockReturnValue({
      json: () =>
        Promise.resolve({
          '{DAV:}displayname': 'Domain',
          '{DAV:}acl': ['{DAV:}read'],
          '{http://open-paas.org/contacts}numberOfContacts': numberOfContacts
        })
    } as unknown as ReturnType<typeof api>)
  }

  const fetchDomainBook = async (): Promise<AddressBook | undefined> => {
    const books = await fetchAddressBooks('alice-id', [
      { domainId: 'domain-1', joinedAt: '2026-01-01' }
    ])
    return books.find(book => book.id === 'dab')
  }

  it('reads the count of the domain book', async () => {
    domainBook(12)

    expect((await fetchDomainBook())?.contactsCount).toBe(12)
  })

  it.each(['12', 1.5, -1])(
    'reads a malformed count %p of the domain book as unknown',
    async numberOfContacts => {
      domainBook(numberOfContacts)

      expect((await fetchDomainBook())?.contactsCount).toBeNull()
    }
  )

  it('drops the books without href, as they can be neither opened nor written to', async () => {
    vi.mocked(api.get).mockReset()
    vi.mocked(api.get).mockReturnValue({
      json: () =>
        Promise.resolve({
          _embedded: {
            'dav:addressbook': [
              {
                'dav:syncToken': 1,
                numberOfContacts: 0,
                'dav:acl': ['dav:read', 'dav:write']
              },
              {
                _links: { self: { href: '/addressbooks/u1/contacts.json' } },
                'dav:name': 'My book',
                'dav:acl': ['dav:read']
              }
            ]
          }
        })
    } as unknown as ReturnType<typeof api.get>)

    const books = await fetchAddressBooks('u1')

    expect(books.map(book => book.id)).toEqual(['contacts'])
  })

  it('classifies every book for the current user', async () => {
    vi.mocked(api.get).mockReturnValue({
      json: () =>
        Promise.resolve({
          _embedded: {
            'dav:addressbook': [
              {
                _links: { self: { href: '/addressbooks/me-id/contacts.json' } },
                'dav:acl': ['dav:read', 'dav:write']
              },
              {
                _links: { self: { href: '/addressbooks/me-id/family.json' } },
                'dav:acl': ['dav:read', 'dav:write']
              },
              {
                _links: { self: { href: '/addressbooks/me-id/shared.json' } },
                'dav:acl': ['dav:read'],
                'dav:share-access': 2,
                'openpaas:source': '/addressbooks/bob-id/team.json'
              },
              {
                _links: { self: { href: '/addressbooks/me-id/public.json' } },
                'dav:acl': ['dav:read'],
                'openpaas:source': '/addressbooks/bob-id/public.json'
              }
            ]
          }
        })
    } as unknown as ReturnType<typeof api.get>)

    const books = await fetchAddressBooks('me-id')

    expect(books.map(({ id, kind }) => ({ id, kind }))).toEqual([
      { id: 'contacts', kind: 'default' },
      { id: 'family', kind: 'personal' },
      { id: 'shared', kind: 'delegated' },
      { id: 'public', kind: 'subscribed' }
    ])
    expect(books[2].capabilities.addContacts).toBe(false)
  })
})

describe('searchContacts', () => {
  const book = (id: string, userId: string): AddressBook =>
    classifyAddressBook(
      { id, userId, name: id, contactsCount: 0, acl: [], canWrite: false },
      'me-id'
    )

  it('searches the domain book in its members, and stores its results as the domain book', async () => {
    vi.mocked(api.post).mockReturnValue({
      json: () =>
        Promise.resolve({
          _embedded: {
            'dav:item': [
              {
                _links: {
                  self: {
                    href: '/addressbooks/domain-id/domain-members/c1.vcf'
                  }
                },
                data: ['vcard', [['fn', {}, 'text', 'Alice']]]
              },
              {
                _links: {
                  self: { href: '/addressbooks/me-id/contacts/c2.vcf' }
                },
                data: ['vcard', [['fn', {}, 'text', 'Bob']]]
              }
            ]
          }
        })
    } as unknown as ReturnType<typeof api.post>)

    const entries = await searchContacts(
      [book('contacts', 'me-id'), book('dab', 'domain-id')],
      'a'
    )

    expect(vi.mocked(api.post).mock.calls[0][1]).toEqual(
      expect.objectContaining({
        json: {
          query: 'a',
          addressBooks: [
            { userId: 'me-id', addressBookId: 'contacts' },
            { userId: 'domain-id', addressBookId: 'domain-members' }
          ]
        }
      })
    )
    expect(entries.map(entry => entry.addressBookId)).toEqual([
      'dab',
      'contacts'
    ])
  })
})

describe('fetchSubscribableAddressBooks', () => {
  it('lists the books of the owner the user can read, delegated ones included', async () => {
    vi.mocked(api.get).mockReset()
    vi.mocked(api.get).mockReturnValue({
      json: () => Promise.resolve({ _embedded: { 'dav:addressbook': [] } })
    } as unknown as ReturnType<typeof api.get>)

    await fetchSubscribableAddressBooks('alice-id')

    expect(api.get).toHaveBeenCalledWith('dav/addressbooks/alice-id.json', {
      searchParams: { personal: 'true', contactsCount: 'true' },
      headers: { Accept: 'application/vcard+json' }
    })
  })
})

describe('fetchAddressBookDetails', () => {
  it('keeps the valid invites when some are malformed', async () => {
    vi.mocked(api).mockReturnValue({
      json: () =>
        Promise.resolve({
          '{DAV:}invite': [
            {
              access: 2,
              comment: null,
              href: 'mailto:a@x.example',
              inviteStatus: 2,
              principal: 'principals/users/m1'
            },
            null,
            'not an invite',
            { access: 2, inviteStatus: 2, principal: 12 },
            {
              access: 2,
              inviteStatus: 2,
              href: 12,
              principal: 'principals/users/m2'
            }
          ],
          acl: []
        })
    } as never)

    const { members } = await fetchAddressBookDetails('u1', 'b1')

    expect(members.map(m => [m.openpaasId, m.email, m.href])).toEqual([
      ['m1', 'a@x.example', 'mailto:a@x.example'],
      ['m2', '', undefined]
    ])
  })

  it('lists no member when the invites are not an array', async () => {
    vi.mocked(api).mockReturnValue({
      json: () => Promise.resolve({ '{DAV:}invite': { foo: 1 }, acl: [] })
    } as never)

    const { members } = await fetchAddressBookDetails('u1', 'b1')

    expect(members).toEqual([])
  })

  it('tells whether the book is published from its own ACL', async () => {
    vi.mocked(api).mockReset()
    vi.mocked(api).mockReturnValue({
      json: () =>
        Promise.resolve({
          acl: [{ privilege: '{DAV:}read', principal: '{DAV:}authenticated' }]
        })
    } as never)

    const { isPublic } = await fetchAddressBookDetails('u1', 'b1')

    expect(isPublic).toBe(true)
    expect(api).toHaveBeenCalledTimes(1)
  })

  it('tells whether a delegated copy is published from the ACL of its source book', async () => {
    vi.mocked(api).mockReset()
    vi.mocked(api).mockImplementation(((url: string) => ({
      json: () =>
        Promise.resolve(
          url === 'dav/addressbooks/alice/source.json'
            ? {
                acl: [
                  { privilege: '{DAV:}read', principal: '{DAV:}authenticated' }
                ]
              }
            : {
                '{DAV:}invite': [],
                acl: [
                  {
                    privilege: '{DAV:}share',
                    principal: 'principals/users/bob'
                  }
                ]
              }
        )
    })) as never)

    const { isPublic } = await fetchAddressBookDetails('bob', 'copy', {
      userId: 'alice',
      bookId: 'source'
    })

    expect(isPublic).toBe(true)
    expect(api).toHaveBeenCalledWith('dav/addressbooks/alice/source.json', {
      method: 'PROPFIND',
      json: { properties: ['acl'] }
    })
  })

  it('tells a delegated copy is private when its source book is not published', async () => {
    vi.mocked(api).mockReset()
    vi.mocked(api).mockReturnValue({
      json: () => Promise.resolve({ '{DAV:}invite': [], acl: [] })
    } as never)

    const { isPublic } = await fetchAddressBookDetails('bob', 'copy', {
      userId: 'alice',
      bookId: 'source'
    })

    expect(isPublic).toBe(false)
  })
})

describe('resolveAddressBookMember', () => {
  const invited = {
    email: 'bob@open-paas.org',
    given_name: '',
    family_name: '',
    name: 'bob@open-paas.org',
    sid: 'bob-id',
    sub: 'bob-id',
    openpaasId: 'bob-id',
    role: AddressBookAccessLevel.Editor,
    href: 'mailto:bob@open-paas.org'
  }

  beforeEach(() => {
    vi.mocked(fetchUserById).mockReset()
  })

  it('completes the member with its profile, keeping its role', async () => {
    vi.mocked(fetchUserById).mockResolvedValue({
      id: 'bob-id',
      firstname: 'bob',
      lastname: 'bob',
      preferredEmail: 'bob@open-paas.org'
    } as never)

    const member = await resolveAddressBookMember(invited)

    expect(member).toMatchObject({
      name: 'bob bob',
      openpaasId: 'bob-id',
      role: AddressBookAccessLevel.Editor,
      href: 'mailto:bob@open-paas.org'
    })
  })

  it('keeps the member as invited when its profile cannot be fetched', async () => {
    vi.mocked(fetchUserById).mockRejectedValue(new Error('not found'))

    await expect(resolveAddressBookMember(invited)).resolves.toBe(invited)
  })
})

describe('export', () => {
  const vcf = new Blob(['BEGIN:VCARD\r\nEND:VCARD\r\n'], {
    type: 'text/vcard'
  })
  const book: AddressBook = classifyAddressBook(
    {
      id: 'book1',
      userId: 'bob',
      name: 'Team',
      contactsCount: 2,
      acl: [],
      canWrite: true
    },
    'bob'
  )

  beforeEach(() => {
    vi.mocked(api.get).mockReset()
    vi.mocked(api.get).mockReturnValue({
      blob: () => Promise.resolve(vcf)
    } as unknown as ReturnType<typeof api.get>)
  })

  it('exports every contact of the book as vCard', async () => {
    await expect(exportAddressBook(book)).resolves.toBe(vcf)

    expect(api.get).toHaveBeenCalledWith('dav/addressbooks/bob/book1.json', {
      searchParams: { export: 'true' },
      headers: { Accept: 'application/vcard' }
    })
  })

  it('exports the domain book from its members collection', async () => {
    await exportAddressBook({ ...book, id: 'dab', userId: 'domain1' })

    expect(api.get).toHaveBeenCalledWith(
      'dav/addressbooks/domain1/domain-members.json',
      expect.objectContaining({ searchParams: { export: 'true' } })
    )
  })

  it('exports a single contact as vCard', async () => {
    await expect(exportContact(book, 'a/b')).resolves.toBe(vcf)

    expect(api.get).toHaveBeenCalledWith(
      'dav/addressbooks/bob/book1/a%2Fb.vcf',
      { headers: { Accept: 'text/vcard' } }
    )
  })
})

describe('nickname text-list', () => {
  const withNicknames = (...values: string[]): DavContactItem =>
    ({
      _links: { self: { href: '/addressbooks/u/b/c.vcf' } },
      data: [
        'vcard',
        [
          ['fn', {}, 'text', 'Jane'],
          ['nickname', {}, 'text', ...values]
        ]
      ]
    }) as unknown as DavContactItem

  it('reads every value of a multi-valued NICKNAME', () => {
    expect(normalizeContact(withNicknames('Jo', 'JJ')).nicknames).toEqual([
      'Jo',
      'JJ'
    ])
  })

  it('writes back every value of a multi-valued NICKNAME', () => {
    const contact = normalizeContact(withNicknames('Jo', 'JJ'))
    const nickname = denormalizeContact(contact)[1].find(
      p => p[0] === 'nickname'
    )
    expect(nickname).toEqual(['nickname', {}, 'text', 'Jo', 'JJ'])
  })

  it('ignores a NICKNAME holding only empty values', () => {
    const contact = normalizeContact(withNicknames(''))
    expect(contact).not.toHaveProperty('nicknames')
    expect(denormalizeContact(contact)[1].some(p => p[0] === 'nickname')).toBe(
      false
    )
  })
})

describe('DAV paths of a book whose ids need encoding', () => {
  const book = classifyAddressBook(
    {
      id: 'my book',
      userId: 'c#1',
      name: 'Team',
      contactsCount: 1,
      acl: [],
      canWrite: true
    },
    'c#1'
  )
  const ref = { userId: book.userId, addressBookId: book.id }
  const cardPath = 'dav/addressbooks/c%231/my%20book/c1.vcf'

  beforeEach(() => {
    vi.mocked(api).mockReset()
    vi.mocked(api.get).mockReset()
    vi.mocked(api.get).mockReturnValue({
      blob: () => Promise.resolve(new Blob()),
      json: () => Promise.resolve(['vcard', []])
    } as unknown as ReturnType<typeof api.get>)
    vi.mocked(api.put).mockReset()
    vi.mocked(api.delete).mockReset()
  })

  it('encodes the user and book ids like copyContact does', async () => {
    await exportContact(book, 'c1')

    expect(api.get).toHaveBeenCalledWith(cardPath, {
      headers: { Accept: 'text/vcard' }
    })
  })

  it('addresses the same card from every call', async () => {
    await fetchContact(book, 'c1')
    await saveContact(book.userId, book.id, {
      ...normalizeContact(namedItem),
      id: 'c1'
    })
    await deleteContact(book.userId, book.id, 'c1')
    await moveContact(ref, ref, 'c1')
    await copyContact(ref, ref, 'c1')

    expect(vi.mocked(api.get).mock.calls[0][0]).toBe(cardPath)
    expect(vi.mocked(api.put).mock.calls[0][0]).toBe(cardPath)
    expect(vi.mocked(api.delete).mock.calls[0][0]).toBe(cardPath)
    expect(vi.mocked(api).mock.calls.map(([url]) => url)).toEqual([
      cardPath,
      cardPath
    ])
  })

  it('encodes the ids of the book collection', async () => {
    await exportAddressBook(book)

    expect(api.get).toHaveBeenCalledWith(
      'dav/addressbooks/c%231/my%20book.json',
      expect.anything()
    )
  })
})

describe('normalizeAddressBook', () => {
  it('decodes the user and book ids of its href, to encode them once', () => {
    const book = normalizeAddressBook({
      _links: { self: { href: '/addressbooks/c%231/My%20Book.json' } },
      'dav:syncToken': 0
    })

    expect(book).toMatchObject({ id: 'My Book', userId: 'c#1' })
  })

  it('keeps a segment that is not a valid encoding as it is', () => {
    const book = normalizeAddressBook({
      _links: { self: { href: '/addressbooks/u1/100%.json' } },
      'dav:syncToken': 0
    })

    expect(book.id).toBe('100%')
  })
})
