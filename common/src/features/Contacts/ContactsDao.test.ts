/**
 * @jest-environment jsdom
 */
import {
  denormalizeContact,
  getCardProperty,
  normalizeContact
} from './transformer/ContactsTransformer'
import { DavContactItem, DavContactsResponse, JCalCard } from './davTypes'

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
        emails: [{ type: 'work', value: 'jane.roe@example.org' }]
      })
    )
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
    expect(contact).not.toHaveProperty('nickname')
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
      { type: 'Work', value: '0788668833' }
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
      { type: 'Work', value: '0788668833' }
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
      { type: 'Work', value: 'work@example.org' },
      { type: 'Home', value: 'home@example.org' }
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
      { type: 'Work', value: '0788668833' },
      { type: 'Home', value: '0788668844' }
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
            ['', '', 'test', 'test', '', 'test', 'test']
          ]
        ]
      ]
    }
    expect(normalizeContact(withAdr).addresses).toEqual([
      {
        type: 'Work',
        poBox: '',
        extendedAddress: '',
        street: 'test',
        locality: 'test',
        region: '',
        postalCode: 'test',
        country: 'test',
        label: null
      }
    ])
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
      { type: 'Skype', value: 'testskype' },
      { type: 'Twitter', value: 'testtwitter' }
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
      'https://example.org',
      'https://example.com'
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
      { type: 'Work', value: 'test@example.org' }
    ])
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
        ['email', { type: 'work' }, 'text', 'mailto:alice@twake.app'],
        ['tel', { type: 'cell' }, 'text', '+336'],
        ['socialprofile', { type: 'matrix' }, 'text', '@alice:twake.app']
      ]
    ])
  })
})
