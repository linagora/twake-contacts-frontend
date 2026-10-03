import { DavAddressBookItem } from '../davTypes'
import { normalizeAddressBook } from './ContactsTransformer'

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
})
