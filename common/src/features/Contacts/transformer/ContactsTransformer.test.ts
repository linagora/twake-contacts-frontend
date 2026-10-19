import { AddressBookAccessLevel, DavAddressBookItem } from '../davTypes'
import { userData } from '../../User/userDataTypes'
import {
  buildFullShareesList,
  normalizeAddressBook
} from './ContactsTransformer'

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
