import { DEFAULT_ADDRESS_BOOK_ID } from './constants'
import { AddressBook } from './contactsTypes'
import { sortAddressBooks } from './contactsUtils'

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
