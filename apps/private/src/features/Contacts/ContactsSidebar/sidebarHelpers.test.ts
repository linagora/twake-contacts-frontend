import {
  TEST_USER_ID,
  aDomainBook,
  aSharedBook,
  anAddressBook,
  byId
} from '@common/test/builders'
import { categorizeAddressBooks, getCreateContactLink } from './sidebarHelpers'

describe('sidebarHelpers', () => {
  describe('getCreateContactLink', () => {
    it('returns /contacts/new when no address book id is provided', () => {
      expect(getCreateContactLink(undefined, undefined)).toBe('/contacts/new')
    })

    it('returns /contacts/new when the book cannot be written to', () => {
      const book = anAddressBook({ id: 'b1', canWrite: false })
      expect(getCreateContactLink('b1', book)).toBe('/contacts/new')
    })

    it('returns /contacts/new when addressBookId is dab', () => {
      const book = aDomainBook({ canWrite: true })
      expect(getCreateContactLink('dab', book)).toBe('/contacts/new')
    })

    it('returns /contacts/:id/new when writable book is selected', () => {
      const book = anAddressBook({ id: 'b1' })
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
      const book = anAddressBook({ id: 'b1', canWrite: false })
      expect(getCreateContactLink('b1', book, true)).toBe('/contacts/new')
    })

    it('returns /contacts/new for dab while the books are loading', () => {
      expect(getCreateContactLink('dab', undefined, true)).toBe('/contacts/new')
    })
  })

  describe('categorizeAddressBooks', () => {
    it('categorizes books into personal, shared, and domain books', () => {
      const books = byId(
        anAddressBook({ id: 'b1', ownerId: TEST_USER_ID }),
        aSharedBook({ id: 'b2' }),
        aDomainBook()
      )

      const categorized = categorizeAddressBooks(
        books,
        TEST_USER_ID,
        key => key
      )

      expect(categorized.personalBooks.map(b => b.id)).toEqual(['b1'])
      expect(categorized.sharedBooks.map(b => b.id)).toEqual(['b2'])
      expect(categorized.domainBooks.map(b => b.id)).toEqual(['dab'])
    })
  })
})
