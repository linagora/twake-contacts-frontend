/**
 * @jest-environment jsdom
 */
import {
  denormalizeContact,
  getCardProperty,
  normalizeContact
} from './transformer/ContactsTransformer'
import { api } from '@common/utils/apiUtils'
import { fetchUserById } from '@common/features/User/UserDao'
import {
  exportAddressBook,
  exportContact,
  fetchContact,
  fetchContactsPage,
  fetchSubscribableAddressBooks,
  resolveAddressBookMember,
  subscribeToAddressBook
} from './ContactsDao'
import { formatAddress } from './contactsUtils'
import {
  AddressBookAccessLevel,
  DavContactItem,
  DavContactsResponse,
  JCalCard
} from './davTypes'
import { AddressBook } from './contactsTypes'
import { DEFAULT_CONTACT_SORT } from './constants'

jest.mock('@common/utils/apiUtils', () => ({
  api: { get: jest.fn(), post: jest.fn() }
}))
jest.mock('@common/features/User/UserDao', () => ({ fetchUserById: jest.fn() }))

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
        country: 'France'
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
    jest.mocked(api.get).mockReset()
    jest.mocked(api.get).mockReturnValue({
      json: () => Promise.resolve(card)
    } as unknown as ReturnType<typeof api.get>)
  })

  it('reads the single vCard of the contact as jCard', async () => {
    const contact = await fetchContact({ ...book, id: 'contacts' }, 'c60')

    expect(api.get).toHaveBeenCalledWith(
      'dav/addressbooks/bob/contacts/c60.vcf',
      { headers: { Accept: 'application/vcard+json' } }
    )
    expect(contact).toEqual(
      expect.objectContaining({
        id: 'c60',
        displayName: 'Search Own',
        emails: [{ type: 'work', value: 'own@twake.app' }]
      })
    )
  })

  it('reads a domain member from the domain members book', async () => {
    await fetchContact({ ...book, id: 'dab', userId: 'domain-1' }, 'm1')

    expect(api.get).toHaveBeenCalledWith(
      'dav/addressbooks/domain-1/domain-members/m1.vcf',
      expect.anything()
    )
  })
})

describe('fetchContactsPage', () => {
  const card: JCalCard = ['vcard', [['fn', {}, 'text', 'Alice Roche']]]
  const book: AddressBook = {
    id: 'book1',
    userId: 'u1',
    name: 'Book 1',
    contactsCount: null,
    acl: [],
    canWrite: true
  }

  const mockResponse = (response: DavContactsResponse): void => {
    jest
      .mocked(api.get)
      .mockReturnValue({ json: () => Promise.resolve(response) } as never)
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

describe('subscribeToAddressBook', () => {
  const source: AddressBook = {
    id: 'public1',
    userId: 'alice-id',
    name: 'Alice Public Read',
    contactsCount: 1,
    acl: ['dav:read'],
    canWrite: false
  }

  const listing = (books: unknown[]): void => {
    jest.mocked(api.get).mockReturnValue({
      json: () => Promise.resolve({ _embedded: { 'dav:addressbook': books } })
    } as unknown as ReturnType<typeof api.get>)
  }

  beforeEach(() => {
    jest.mocked(api.post).mockResolvedValue({} as never)
    jest.mocked(api.get).mockReset()
    listing([])
    jest.mocked(fetchUserById).mockReset()
  })

  it('reads the book back, as Sabre may restore a delegation with its role', async () => {
    jest.spyOn(crypto, 'randomUUID').mockReturnValue('1-2-3-4-5')
    jest
      .mocked(fetchUserById)
      .mockResolvedValue({ firstname: 'alice', lastname: 'alice' } as never)
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
        ownerDisplayName: 'alice alice'
      })
    )
  })

  it('falls back to a read-only subscription when the book cannot be read back', async () => {
    jest.spyOn(console, 'warn').mockImplementation(() => {})
    jest.mocked(api.get).mockImplementation(() => {
      throw new Error('network')
    })

    const book = await subscribeToAddressBook('carol-id', source, 'alice')

    expect(book).toEqual(
      expect.objectContaining({
        sourceBookId: 'public1',
        canWrite: false,
        ownerId: 'alice-id'
      })
    )
  })

  it('names the owner from the profile, as when the books are loaded', async () => {
    jest
      .mocked(fetchUserById)
      .mockResolvedValue({ firstname: 'alice', lastname: 'alice' } as never)

    const book = await subscribeToAddressBook('carol-id', source, 'alice')

    expect(fetchUserById).toHaveBeenCalledWith('alice-id')
    expect(book.ownerId).toBe('alice-id')
    expect(book.ownerDisplayName).toBe('alice alice')
  })

  it('keeps the given owner name when the profile cannot be read', async () => {
    jest.spyOn(console, 'warn').mockImplementation(() => {})
    jest.mocked(fetchUserById).mockRejectedValue(new Error('not found'))

    const book = await subscribeToAddressBook('carol-id', source, 'alice')

    expect(book.ownerDisplayName).toBe('alice')
  })

  it('keeps the given owner name when the profile has no name', async () => {
    jest.mocked(fetchUserById).mockResolvedValue({} as never)

    const book = await subscribeToAddressBook('carol-id', source, 'alice')

    expect(book.ownerDisplayName).toBe('alice')
  })
})

describe('fetchSubscribableAddressBooks', () => {
  it('lists the books of the owner the user can read, delegated ones included', async () => {
    jest.mocked(api.get).mockReset()
    jest.mocked(api.get).mockReturnValue({
      json: () => Promise.resolve({ _embedded: { 'dav:addressbook': [] } })
    } as unknown as ReturnType<typeof api.get>)

    await fetchSubscribableAddressBooks('alice-id')

    expect(api.get).toHaveBeenCalledWith('dav/addressbooks/alice-id.json', {
      searchParams: { personal: 'true', contactsCount: 'true' },
      headers: { Accept: 'application/vcard+json' }
    })
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

  beforeEach(() => jest.mocked(fetchUserById).mockReset())

  it('completes the member with its profile, keeping its role', async () => {
    jest.mocked(fetchUserById).mockResolvedValue({
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
    jest.mocked(fetchUserById).mockRejectedValue(new Error('not found'))

    await expect(resolveAddressBookMember(invited)).resolves.toBe(invited)
  })
})

describe('export', () => {
  const vcf = new Blob(['BEGIN:VCARD\r\nEND:VCARD\r\n'], {
    type: 'text/vcard'
  })
  const book: AddressBook = {
    id: 'book1',
    userId: 'bob',
    name: 'Team',
    contactsCount: 2,
    acl: [],
    canWrite: true
  }

  beforeEach(() => {
    jest.mocked(api.get).mockReset()
    jest.mocked(api.get).mockReturnValue({
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
