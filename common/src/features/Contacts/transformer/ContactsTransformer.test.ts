import {
  AddressBookAccessLevel,
  DavAddressBookItem,
  DavContactItem,
  JCalProperty
} from '../davTypes'
import { userData } from '../../User/userDataTypes'
import { Contact } from '../contactsTypes'
import {
  buildFullShareesList,
  denormalizeContact,
  normalizeAddressBook,
  normalizeContact
} from './ContactsTransformer'

describe('TEL value type round trip', () => {
  const cardWithTel = (tel: JCalProperty): DavContactItem =>
    ({
      _links: { self: { href: '/addressbooks/u/contacts/c1.vcf' } },
      data: [
        'vcard',
        [
          ['version', {}, 'text', '4.0'],
          ['fn', {}, 'text', 'Jürgen Müller'],
          tel
        ]
      ]
    }) as unknown as DavContactItem

  const savedTels = (tel: JCalProperty): JCalProperty[] =>
    denormalizeContact(normalizeContact(cardWithTel(tel)))[1].filter(
      p => p[0] === 'tel'
    )

  it('keeps a uri TEL as a tel: uri on save', () => {
    expect(
      savedTels(['tel', { type: 'work' }, 'uri', 'tel:+49-30-1234;ext=5'])
    ).toEqual([['tel', { type: 'work' }, 'uri', 'tel:+49-30-1234;ext=5']])
  })

  it('shows a uri TEL without its scheme', () => {
    const contact = normalizeContact(
      cardWithTel(['tel', {}, 'uri', 'tel:+49-30-1234'])
    )
    expect(contact.phones).toEqual([
      {
        type: null,
        value: '+49-30-1234',
        source: { valueType: 'uri', value: 'tel:+49-30-1234' }
      }
    ])
  })

  it('keeps a text TEL as text on save', () => {
    expect(savedTels(['tel', { type: 'home' }, 'text', '+33 1 23'])).toEqual([
      ['tel', { type: 'home' }, 'text', '+33 1 23']
    ])
  })

  it('writes a new phone as text', () => {
    const card = denormalizeContact({
      id: 'c1',
      displayName: 'New',
      emails: [],
      phones: [{ type: 'cell', value: '0612' }]
    })
    expect(card[1].filter(p => p[0] === 'tel')).toEqual([
      ['tel', { type: 'cell' }, 'text', '0612']
    ])
  })
})

describe('normalizeContact', () => {
  const contactAt = (href: string): Contact =>
    normalizeContact({
      _links: { self: { href } },
      data: ['vcard', [['fn', {}, 'text', 'Jo']]]
    })

  it('holds the decoded card file name as id', () => {
    expect(contactAt('/addressbooks/bob/book1/a%2Fb.vcf').id).toBe('a/b')
  })

  it('keeps a file name that is not valid percent-encoding as is', () => {
    expect(contactAt('/addressbooks/bob/book1/100%.vcf').id).toBe('100%')
  })

  it('strips the extension only at the end of the file name', () => {
    expect(contactAt('/addressbooks/bob/book1/x.vcfy.vcf').id).toBe('x.vcfy')
  })

  it('keeps an encoded ".vcf" inside the file name', () => {
    expect(contactAt('/addressbooks/bob/book1/a%2Evcf%2Fb.vcf').id).toBe(
      'a.vcf/b'
    )
  })
})

describe('preferred values (#451)', () => {
  const contactWith = (properties: JCalProperty[]): Contact =>
    normalizeContact({
      _links: { self: { href: '/addressbooks/u/b/c.vcf' } },
      data: ['vcard', [['fn', {}, 'text', 'Jo'], ...properties]]
    })

  const emailValues = (properties: JCalProperty[]): string[] =>
    contactWith(properties).emails.map(email => email.value)

  it.each([[{ pref: '1' }], [{ type: ['INTERNET', 'HOME', 'pref'] }]])(
    'puts the preferred email first with %j',
    params => {
      expect(
        emailValues([
          ['email', {}, 'text', 'a@x.example'],
          ['email', params, 'text', 'f+tag@x.example']
        ])
      ).toEqual(['f+tag@x.example', 'a@x.example'])
    }
  )

  it('orders the emails by PREF value, then pref in TYPE, then unmarked', () => {
    expect(
      emailValues([
        ['email', {}, 'text', 'none@x.example'],
        ['email', { type: 'PREF' }, 'text', 'type@x.example'],
        ['email', { pref: '50' }, 'text', 'fifty@x.example'],
        ['email', { pref: ['2'] }, 'text', 'two@x.example']
      ])
    ).toEqual([
      'two@x.example',
      'fifty@x.example',
      'type@x.example',
      'none@x.example'
    ])
  })

  it('keeps the card order between emails of the same preference', () => {
    expect(
      emailValues([
        ['email', {}, 'text', 'a@x.example'],
        ['email', { pref: '1' }, 'text', 'b@x.example'],
        ['email', {}, 'text', 'c@x.example'],
        ['email', { pref: '1' }, 'text', 'd@x.example']
      ])
    ).toEqual(['b@x.example', 'd@x.example', 'a@x.example', 'c@x.example'])
  })

  it.each([['0'], ['101'], ['1.5'], ['abc'], ['']])(
    'ignores the out of range PREF %j',
    pref => {
      expect(
        emailValues([
          ['email', {}, 'text', 'a@x.example'],
          ['email', { pref }, 'text', 'b@x.example']
        ])
      ).toEqual(['a@x.example', 'b@x.example'])
    }
  )

  it('puts the preferred phone first', () => {
    expect(
      contactWith([
        ['tel', {}, 'text', '0611'],
        ['tel', { pref: '1' }, 'text', '0622']
      ]).phones?.map(phone => phone.value)
    ).toEqual(['0622', '0611'])
  })

  it('writes the preferred email first on save', () => {
    const saved = denormalizeContact(
      contactWith([
        ['email', {}, 'text', 'a@x.example'],
        ['email', { pref: '1' }, 'text', 'b@x.example']
      ])
    )[1].filter(prop => prop[0] === 'email')
    expect(saved.map(prop => prop[3])).toEqual(['b@x.example', 'a@x.example'])
  })
})

describe('normalizeContact TYPE lists', () => {
  const contactWith = (property: JCalProperty): Contact =>
    normalizeContact({
      _links: { self: { href: '/addressbooks/u/b/c.vcf' } },
      data: ['vcard', [property]]
    })

  it.each([
    ['email', ['INTERNET', 'HOME', 'pref'], 'HOME'],
    ['email', ['INTERNET'], null],
    ['email', 'work', 'work'],
    ['tel', 'VOICE', null],
    ['tel', ['VOICE', 'CELL'], 'CELL'],
    ['tel', ['pref', 'WORK'], 'WORK'],
    ['tel', [12], null]
  ])('%s %j gives %s', (name, type, expected) => {
    const contact = contactWith([
      name,
      { type } as never,
      'text',
      'x@x.example'
    ])
    const entry = name === 'email' ? contact.emails[0] : contact.phones?.[0]
    expect(entry?.type ?? null).toBe(expected)
  })

  it('labels an address with the first known TYPE', () => {
    const contact = contactWith([
      'adr',
      { type: ['pref', 'HOME'] },
      'text',
      ['', '', '1 rue', 'Paris', '', '', '']
    ])
    expect(contact.addresses?.[0].type).toBe('HOME')
  })

  it.each([[['home']], [12], [{}]])(
    'ignores a non-string TYPE element %p',
    first => {
      const contact = normalizeContact({
        _links: { self: { href: '/addressbooks/u1/contacts/c1.vcf' } },
        data: [
          'vcard',
          [
            ['email', { type: [first] } as never, 'text', 'jane@home.example'],
            ['tel', { type: [first] } as never, 'text', '+33 1 23 45 67 89'],
            ['socialprofile', { type: [first] } as never, 'text', 'jane']
          ]
        ]
      })
      expect(contact.emails[0].type).toBeNull()
      expect(contact.phones?.[0].type).toBeNull()
      expect(contact.socialProfiles?.[0].type).toBeNull()
    }
  )

  it('reads a property whose parameters are null', () => {
    const contact = contactWith([
      'tel',
      null as never,
      'text',
      '+33 1 23 45 67 89'
    ])
    expect(contact.phones?.[0]).toEqual({
      type: null,
      value: '+33 1 23 45 67 89'
    })
  })

  it('keeps the service of a social profile', () => {
    const contact = contactWith([
      'socialprofile',
      { type: ['Matrix', 'pref'] },
      'text',
      '@jane:example.org'
    ])
    expect(contact.socialProfiles?.[0].type).toBe('Matrix')
  })

  it.each<[string, unknown]>([
    ['socialprofile', ['Matrix', 'pref']],
    ['email', ['INTERNET', 'HOME', 'pref']],
    ['tel', ['VOICE', 'CELL']]
  ])('writes an unchanged %s TYPE %j back as read', (name, type) => {
    const property: JCalProperty = [name, { type } as never, 'text', 'x']
    const saved = denormalizeContact(contactWith(property))[1]
    expect(saved.find(prop => prop[0] === name)?.[1]).toEqual({ type })
  })
})

const sharedBook = (shareAccess?: number | null): DavAddressBookItem => ({
  _links: { self: { href: '/addressbooks/owner/book.json' } },
  'dav:name': 'QA Book',
  'dav:syncToken': 0,
  'dav:acl': ['dav:read', 'dav:write'],
  'dav:share-access': shareAccess
})

describe('normalizeAddressBook', () => {
  it('is writable when the acl grants write and the book is not shared', () => {
    expect(normalizeAddressBook(sharedBook()).canWrite).toBe(true)
  })

  it('is writable when shared in read-write mode', () => {
    expect(normalizeAddressBook(sharedBook(3)).canWrite).toBe(true)
  })

  it('is read-only when shared in read-only mode despite a writable acl', () => {
    expect(normalizeAddressBook(sharedBook(2)).canWrite).toBe(false)
  })

  it('is read-only when the acl grants no write right', () => {
    const book = { ...sharedBook(), 'dav:acl': ['dav:read'] }
    expect(normalizeAddressBook(book).canWrite).toBe(false)
  })

  it('keeps the share access of a delegated book', () => {
    expect(normalizeAddressBook(sharedBook(5)).shareAccess).toBe(5)
  })

  it('has no share access when the book is not delegated', () => {
    expect(normalizeAddressBook(sharedBook(null)).shareAccess).toBeUndefined()
  })

  it.each([0, 3])('keeps a count %p', count => {
    const book = { ...sharedBook(), numberOfContacts: count }
    expect(normalizeAddressBook(book).contactsCount).toBe(count)
  })

  it.each(['many', '3', 1.5, -1, [], true, null, undefined])(
    'reads a count %p as unknown',
    count => {
      const book = {
        ...sharedBook(),
        numberOfContacts: count
      } as unknown as DavAddressBookItem
      expect(normalizeAddressBook(book).contactsCount).toBeNull()
    }
  )

  it.each(['2', ' 4', [2]])('treats a share access %p as read-only', access => {
    const book = {
      ...sharedBook(),
      'dav:share-access': access
    } as unknown as DavAddressBookItem
    const normalized = normalizeAddressBook(book)
    expect(normalized.canWrite).toBe(false)
    expect(typeof normalized.shareAccess).toBe('number')
  })

  it.each(['', 'abc', { a: 2 }, [], [2, 3], 2.5])(
    'ignores a non-numeric share access %p',
    access => {
      const book = {
        ...sharedBook(),
        'dav:share-access': access
      } as unknown as DavAddressBookItem
      const normalized = normalizeAddressBook(book)
      expect(normalized.shareAccess).toBeUndefined()
      expect(normalized.canWrite).toBe(true)
    }
  )

  it('converts a numeric name to a string', () => {
    const book = { ...sharedBook(), 'dav:name': 12345 }
    expect(normalizeAddressBook(book).name).toBe('12345')
  })

  it('keeps an empty name when the name is not a string nor a number', () => {
    const book = { ...sharedBook(), 'dav:name': { foo: 'bar' } }
    expect(normalizeAddressBook(book).name).toBe('')
  })

  it('keeps an empty name when dav:name is missing', () => {
    const book = { ...sharedBook(), 'dav:name': undefined }
    expect(normalizeAddressBook(book).name).toBe('')
  })

  it('flags the default book', () => {
    const book = {
      ...sharedBook(),
      _links: { self: { href: '/addressbooks/owner/contacts.json' } }
    }
    expect(normalizeAddressBook(book).isDefault).toBe(true)
  })

  it('flags a shared copy of a default book', () => {
    const book = {
      ...sharedBook(2),
      'openpaas:source': '/addressbooks/owner/contacts.json'
    }
    expect(normalizeAddressBook(book).isDefault).toBe(true)
  })

  it.each([{ 0: 'dav:write' }, 'dav:write', [12, null], null])(
    'normalizes a book whose acl is %p as a non-writable book',
    acl => {
      const raw = {
        ...sharedBook(),
        'dav:acl': acl
      } as unknown as DavAddressBookItem
      const book = normalizeAddressBook(raw)
      expect(book.acl).toEqual([])
      expect(book.canWrite).toBe(false)
    }
  )

  it('ignores non-string entries of the acl', () => {
    const raw = {
      ...sharedBook(),
      'dav:acl': [12, 'dav:write', null]
    } as unknown as DavAddressBookItem
    const book = normalizeAddressBook(raw)
    expect(book.acl).toEqual(['dav:write'])
    expect(book.canWrite).toBe(true)
  })

  it('does not flag a shared copy of another book', () => {
    const book = {
      ...sharedBook(2),
      'openpaas:source': '/addressbooks/owner/book.json'
    }
    expect(normalizeAddressBook(book).isDefault).toBe(false)
  })

  it('reads the source of a shared copy given as a HAL object', () => {
    const book = {
      ...sharedBook(2),
      'openpaas:source': {
        _links: { self: { href: '/addressbooks/owner/contacts.json' } }
      }
    }
    expect(normalizeAddressBook(book).isDefault).toBe(true)
  })

  it.each([[['/addressbooks/owner/contacts.json']], [12], [{ foo: 'bar' }]])(
    'ignores a source that is not a path nor a HAL object: %j',
    source => {
      const book = { ...sharedBook(2), 'openpaas:source': source }
      expect(normalizeAddressBook(book).isDefault).toBe(false)
    }
  )

  it('treats an href that is not a string as a missing one', () => {
    const book = { ...sharedBook(), _links: { self: { href: 12 } } }
    expect(normalizeAddressBook(book)).toEqual(
      expect.objectContaining({ id: '', userId: '', name: 'QA Book' })
    )
  })
})

describe('buildFullShareesList', () => {
  const member = (
    openpaasId: string,
    role: AddressBookAccessLevel
  ): userData => ({
    openpaasId,
    role,
    email: `${openpaasId}@example.com`,
    name: openpaasId,
    family_name: '',
    given_name: '',
    sid: '',
    sub: ''
  })

  const ownerEntry = {
    userId: 'alice',
    access: AddressBookAccessLevel.Owner,
    href: 'principals/users/alice'
  }

  it('keeps the owner entry when the owner is invited', () => {
    const sharees = buildFullShareesList(
      'alice',
      [member('bob', AddressBookAccessLevel.Viewer)],
      [
        {
          userId: 'alice',
          role: AddressBookAccessLevel.Viewer,
          href: 'mailto:alice@example.com'
        }
      ]
    )

    expect(sharees).toEqual([
      ownerEntry,
      {
        userId: 'bob',
        access: AddressBookAccessLevel.Viewer,
        href: 'mailto:bob@example.com'
      }
    ])
  })

  it('keeps the owner entry when the owner is listed among the members', () => {
    const sharees = buildFullShareesList(
      'alice',
      [member('alice', AddressBookAccessLevel.Owner)],
      []
    )

    expect(sharees).toEqual([ownerEntry])
  })

  it('applies the updates of the other users', () => {
    const sharees = buildFullShareesList(
      'alice',
      [member('bob', AddressBookAccessLevel.Viewer)],
      [
        {
          userId: 'bob',
          role: AddressBookAccessLevel.Editor,
          href: 'mailto:bob@example.com'
        }
      ]
    )

    expect(sharees).toEqual([
      ownerEntry,
      {
        userId: 'bob',
        access: AddressBookAccessLevel.Editor,
        href: 'mailto:bob@example.com'
      }
    ])
  })

  it('keys an external member, without a user id, by its href', () => {
    const external: userData = {
      ...member('ext', AddressBookAccessLevel.Viewer),
      openpaasId: undefined,
      href: 'mailto:ext@example.com'
    }

    const sharees = buildFullShareesList(
      'alice',
      [external],
      [
        {
          userId: 'mailto:ext@example.com',
          role: AddressBookAccessLevel.None,
          href: 'mailto:ext@example.com'
        }
      ]
    )

    expect(sharees).toEqual([
      ownerEntry,
      {
        userId: 'mailto:ext@example.com',
        access: AddressBookAccessLevel.None,
        href: 'mailto:ext@example.com'
      }
    ])
  })
})

describe('denormalizeContact', () => {
  it('writes URL as a uri on save', () => {
    const contact = normalizeContact({
      _links: { self: { href: '/addressbooks/u/contacts/c1.vcf' } },
      data: [
        'vcard',
        [
          ['version', {}, 'text', '4.0'],
          ['fn', {}, 'text', 'Mei Lin'],
          ['url', {}, 'uri', 'https://mei.example/']
        ]
      ]
    } as unknown as DavContactItem)

    const urls = denormalizeContact(contact)[1].filter(p => p[0] === 'url')

    expect(urls).toEqual([['url', {}, 'uri', 'https://mei.example/']])
  })

  it('shows a multi-valued ORG component as text and writes it back as read', () => {
    const org: JCalProperty = [
      'org',
      {},
      'text',
      [['Acme', 'Acme SAS'], 'Sales']
    ]
    const contact = normalizeContact({
      _links: { self: { href: '/addressbooks/u/contacts/c1.vcf' } },
      data: ['vcard', [['fn', {}, 'text', 'Mei Lin'], org]]
    })

    const saved = denormalizeContact(contact)[1].filter(p => p[0] === 'org')

    expect(contact.org?.name).toBe('Acme Acme SAS')
    expect(saved).toEqual([org])
  })

  it('writes an edited multi-valued component as its new text', () => {
    const contact = normalizeContact({
      _links: { self: { href: '/addressbooks/u/contacts/c1.vcf' } },
      data: [
        'vcard',
        [
          ['fn', {}, 'text', 'Mei Lin'],
          [
            'org',
            {},
            'text',
            [
              ['Acme', 'Acme SAS'],
              ['Sales', 'EMEA']
            ]
          ]
        ]
      ]
    })
    const org = { name: 'Globex', units: ['Sales EMEA'] }

    const saved = denormalizeContact({
      ...contact,
      org: { ...contact.org, ...org }
    })[1].filter(p => p[0] === 'org')

    expect(saved).toEqual([['org', {}, 'text', ['Globex', ['Sales', 'EMEA']]]])
  })
})

describe('BDAY round trip', () => {
  const cardWith = (bday: JCalProperty): DavContactItem =>
    ({
      _links: { self: { href: '/addressbooks/u/contacts/c1.vcf' } },
      data: [
        'vcard',
        [['version', {}, 'text', '4.0'], ['fn', {}, 'text', 'Jane Doe'], bday]
      ]
    }) as unknown as DavContactItem

  const savedBday = (contact: Contact): JCalProperty[] =>
    denormalizeContact(contact)[1].filter(p => p[0] === 'bday')

  it.each(['date', 'date-and-or-time', 'text'])(
    'keeps a %s BDAY value type on an unchanged save',
    type => {
      const contact = normalizeContact(
        cardWith(['bday', {}, type, '1980-02-03'])
      )
      expect(savedBday(contact)).toEqual([['bday', {}, type, '1980-02-03']])
    }
  )

  it('keeps the BDAY parameters on an unchanged save', () => {
    const bday: JCalProperty = [
      'bday',
      { 'x-apple-omit-year': '1604' },
      'date',
      '1604-04-12'
    ]
    expect(savedBday(normalizeContact(cardWith(bday)))).toEqual([bday])
  })

  it.each(['1985-07-14', '--07-14', '1985-07-14T10:00:00Z'])(
    'writes a changed date birthday %s as date-and-or-time',
    value => {
      const contact = normalizeContact(
        cardWith(['bday', {}, 'date', '1980-02-03'])
      )
      expect(savedBday({ ...contact, birthday: value })).toEqual([
        ['bday', {}, 'date-and-or-time', value]
      ])
    }
  )

  it('writes a free-form birthday as text', () => {
    const contact: Contact = {
      id: 'c1',
      displayName: 'Jane Doe',
      emails: [],
      birthday: 'circa 1800'
    }
    expect(savedBday(contact)).toEqual([['bday', {}, 'text', 'circa 1800']])
  })
})

describe('group companions already alone in the card', () => {
  const readCard = (properties: JCalProperty[]): Contact =>
    normalizeContact({
      _links: { self: { href: '/addressbooks/u/contacts/c1.vcf' } },
      data: [
        'vcard',
        [
          ['version', {}, 'text', '3.0'],
          ['uid', {}, 'text', 'c1'],
          ['fn', {}, 'text', 'Mei Tanaka'],
          ...properties
        ]
      ]
    })

  const label: JCalProperty = [
    'x-ablabel',
    { group: 'item1', language: 'en-GB' },
    'unknown',
    'BLOG'
  ]

  it('keeps an X-ABLabel whose group had no other property when read', () => {
    const saved = denormalizeContact(
      readCard([['url', {}, 'uri', 'https://x.example/'], label])
    )

    expect(saved[1]).toContainEqual(label)
  })

  it('keeps it next to an ungrouped X-ABLabel', () => {
    const ungrouped: JCalProperty = ['x-ablabel', {}, 'unknown', 'Mine']

    const saved = denormalizeContact(readCard([ungrouped, label]))

    expect(saved[1]).toContainEqual(ungrouped)
    expect(saved[1]).toContainEqual(label)
  })

  it('keeps an X-ABADR whose group had no other property when read', () => {
    const abadr: JCalProperty = ['x-abadr', { group: 'item2' }, 'unknown', 'fr']

    const saved = denormalizeContact(readCard([abadr]))

    expect(saved[1]).toContainEqual(abadr)
  })

  it('still drops the companion of a grouped property removed before saving', () => {
    const read = readCard([
      ['email', { group: 'item1' }, 'text', 'mei@x.example'],
      label
    ])

    const saved = denormalizeContact({ ...read, emails: [] })

    expect(saved[1]).not.toContainEqual(label)
  })
})
