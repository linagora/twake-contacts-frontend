import { AddressBookWithContacts } from '@common/features/Contacts/contactsTypes'
import { categorizeAddressBooks, getCreateContactLink } from './sidebarHelpers'

const makeBook = (
  id: string,
  userId: string,
  canWrite = true
): AddressBookWithContacts => ({
  id,
  userId,
  ownerId: userId,
  name: `Book ${id}`,
  contactsCount: 0,
  acl: [],
  canWrite,
  contacts: [],
  offset: 0,
  hasMore: false
})

describe('sidebarHelpers', () => {
  describe('getCreateContactLink', () => {
    it('returns /contacts/new when no address book id is provided', () => {
      expect(getCreateContactLink(undefined, undefined)).toBe('/contacts/new')
    })

    it('returns /contacts/new when the book cannot be written to', () => {
      const book = makeBook('b1', 'u1', false)
      expect(getCreateContactLink('b1', book)).toBe('/contacts/new')
    })

    it('returns /contacts/new when addressBookId is dab', () => {
      const book = makeBook('dab', 'u1', true)
      expect(getCreateContactLink('dab', book)).toBe('/contacts/new')
    })

    it('returns /contacts/:id/new when writable book is selected', () => {
      const book = makeBook('b1', 'u1', true)
      expect(getCreateContactLink('b1', book)).toBe('/contacts/b1/new')
    })

    it('keeps the book of the URL while the books are loading', () => {
      expect(getCreateContactLink('b1', undefined, true)).toBe(
        '/contacts/b1/new'
      )
    })

    it('returns /contacts/new when the loaded books do not contain the book', () => {
      expect(getCreateContactLink('b1', undefined, false)).toBe('/contacts/new')
    })

    it('returns /contacts/new when a loaded book cannot be written to while loading', () => {
      const book = makeBook('b1', 'u1', false)
      expect(getCreateContactLink('b1', book, true)).toBe('/contacts/new')
    })

    it('returns /contacts/new for dab while the books are loading', () => {
      expect(getCreateContactLink('dab', undefined, true)).toBe('/contacts/new')
    })
  })

  describe('categorizeAddressBooks', () => {
    it('categorizes books into personal, shared, and domain books', () => {
      const books: Record<string, AddressBookWithContacts> = {
        myBook: makeBook('b1', 'user-1'),
        sharedBook: makeBook('b2', 'user-2'),
        domainBook: makeBook('dab', 'admin')
      }

      const categorized = categorizeAddressBooks(books, 'user-1', key => key)

      expect(categorized.personalBooks.map(b => b.id)).toEqual(['b1'])
      expect(categorized.sharedBooks.map(b => b.id)).toEqual(['b2'])
      expect(categorized.domainBooks.map(b => b.id)).toEqual(['dab'])
    })
  })
})
