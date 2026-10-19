import { DEFAULT_ADDRESS_BOOK_ID } from './constants'
import { AddressBook } from './contactsTypes'
import {
  canShareAddressBook,
  getAddressBookDisplayName,
  sortAddressBooks
} from './contactsUtils'

const makeBook = (id: string, name: string): AddressBook => ({
  id,
  userId: 'u1',
  name,
  contactsCount: 0,
  acl: [],
  canWrite: true
})

const t = (key: string): string => key

describe('sortAddressBooks', () => {
  it('puts the default address book first then sorts by name in natural order', () => {
    const books = [
      makeBook('qa-10', 'Book 10'),
      makeBook('qa-2', 'Book 2'),
      makeBook('qa-a', 'alpha'),
      makeBook('qa-book', 'QA Book'),
      makeBook('qa-rw', 'Team RW'),
      makeBook('qa-z', 'Zeta'),
      makeBook(DEFAULT_ADDRESS_BOOK_ID, 'Zzz contacts')
    ]

    expect(sortAddressBooks(books, t).map(book => book.id)).toEqual([
      DEFAULT_ADDRESS_BOOK_ID,
      'qa-a',
      'qa-2',
      'qa-10',
      'qa-book',
      'qa-rw',
      'qa-z'
    ])
  })

  it('does not mutate the input', () => {
    const books = [makeBook('b', 'B'), makeBook('a', 'A')]

    sortAddressBooks(books, t)

    expect(books.map(book => book.id)).toEqual(['b', 'a'])
  })
})

describe('getAddressBookDisplayName', () => {
  it('returns the name of the book', () => {
    expect(getAddressBookDisplayName(makeBook('qa', 'QA Book'), t)).toBe(
      'QA Book'
    )
  })

  it('names the domain address book', () => {
    expect(getAddressBookDisplayName(makeBook('dab', ''), t)).toBe(
      'contacts.domainAddressBook'
    )
  })

  it('names an unnamed own default book "My contacts"', () => {
    expect(
      getAddressBookDisplayName(makeBook(DEFAULT_ADDRESS_BOOK_ID, ''), t)
    ).toBe('contacts.myContacts')
  })

  it('names an unnamed shared default book "My contacts"', () => {
    const book = { ...makeBook('generated-id', ''), isDefault: true }

    expect(getAddressBookDisplayName(book, t)).toBe('contacts.myContacts')
  })

  it('falls back to the id of an unnamed book', () => {
    expect(getAddressBookDisplayName(makeBook('api-empty', ''), t)).toBe(
      'api-empty'
    )
  })

  it("falls back to the owner's book id of an unnamed shared book", () => {
    const book = {
      ...makeBook('db166579-73b1-4336-a378-354f808ee382', ''),
      ownerId: 'alice',
      sourceBookId: 'qa-empty'
    }

    expect(getAddressBookDisplayName(book, t)).toBe('qa-empty')
  })
})

describe('canShareAddressBook', () => {
  const ownBook = makeBook('own', 'Own')
  const sharedBook = (shareAccess?: number): AddressBook => ({
    ...makeBook('copy', 'Bob book'),
    ownerId: 'bob',
    sourceBookId: 'source',
    shareAccess
  })

  it('lets the owner share the book', () => {
    expect(canShareAddressBook(ownBook)).toBe(true)
  })

  it('lets a sharee with administration rights share the book', () => {
    expect(canShareAddressBook(sharedBook(5))).toBe(true)
  })

  it('does not let a read-write sharee share the book', () => {
    expect(canShareAddressBook(sharedBook(3))).toBe(false)
  })

  it('does not let a read-only sharee share the book', () => {
    expect(canShareAddressBook(sharedBook(2))).toBe(false)
  })

  it('does not let a subscriber of a public read-write book share it', () => {
    expect(canShareAddressBook(sharedBook())).toBe(false)
  })

  it('does not share the domain address book', () => {
    expect(canShareAddressBook(makeBook('dab', 'Domain'))).toBe(false)
  })
})
