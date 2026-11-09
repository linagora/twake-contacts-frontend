import {
  AddressBookAccessLevel,
  DavAddressBookItem,
  DavContactItem,
  JCalProperty
} from '../davTypes'
import { userData } from '../../User/userDataTypes'
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
      { type: null, value: '+49-30-1234', valueType: 'uri' }
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

const sharedBook = (shareAccess?: number | null): DavAddressBookItem => ({
  _links: { self: { href: '/addressbooks/owner/book.json' } },
  'dav:name': 'QA Book',
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

  it('does not flag a shared copy of another book', () => {
    const book = {
      ...sharedBook(2),
      'openpaas:source': '/addressbooks/owner/book.json'
    }
    expect(normalizeAddressBook(book).isDefault).toBe(false)
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
})
