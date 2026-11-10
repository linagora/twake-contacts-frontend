import {
  aDomainBook,
  aSharedBook,
  aSubscribedBook,
  anAddressBook,
  theCollectedBook,
  theDefaultBook
} from '@common/test/builders'
import { DEFAULT_ADDRESS_BOOK_ID } from './constants'
import {
  canShareAddressBook,
  getAddressBookDisplayName,
  isContactTransferDestination,
  sortAddressBooks
} from './contactsUtils'
import { AddressBookAccessLevel } from './davTypes'

const t = (key: string): string => key

describe('sortAddressBooks', () => {
  it('puts the default address book first then sorts by name in natural order', () => {
    const books = [
      anAddressBook({ id: 'qa-10', name: 'Book 10' }),
      anAddressBook({ id: 'qa-2', name: 'Book 2' }),
      anAddressBook({ id: 'qa-a', name: 'alpha' }),
      anAddressBook({ id: 'qa-book', name: 'QA Book' }),
      anAddressBook({ id: 'qa-rw', name: 'Team RW' }),
      anAddressBook({ id: 'qa-z', name: 'Zeta' }),
      theDefaultBook({ name: 'Zzz contacts' })
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
    const books = [
      anAddressBook({ id: 'b', name: 'B' }),
      anAddressBook({ id: 'a', name: 'A' })
    ]

    sortAddressBooks(books, t)

    expect(books.map(book => book.id)).toEqual(['b', 'a'])
  })
})

describe('getAddressBookDisplayName', () => {
  it('returns the name of the book', () => {
    expect(
      getAddressBookDisplayName(anAddressBook({ id: 'qa', name: 'QA Book' }), t)
    ).toBe('QA Book')
  })

  it('names the domain address book', () => {
    expect(getAddressBookDisplayName(aDomainBook(), t)).toBe(
      'contacts.domainAddressBook'
    )
  })

  it('names an unnamed own default book "My contacts"', () => {
    // identified by its id alone, without the isDefault flag
    const book = anAddressBook({ id: DEFAULT_ADDRESS_BOOK_ID, name: '' })

    expect(getAddressBookDisplayName(book, t)).toBe('contacts.myContacts')
  })

  it('names an unnamed shared default book "My contacts"', () => {
    const book = aSharedBook({
      id: 'generated-id',
      name: '',
      sourceBookId: DEFAULT_ADDRESS_BOOK_ID,
      isDefault: true
    })

    expect(getAddressBookDisplayName(book, t)).toBe('contacts.myContacts')
  })

  it('falls back to the id of an unnamed book', () => {
    expect(
      getAddressBookDisplayName(anAddressBook({ id: 'api-empty', name: '' }), t)
    ).toBe('api-empty')
  })

  it("falls back to the owner's book id of an unnamed shared book", () => {
    const book = aSharedBook({
      id: 'db166579-73b1-4336-a378-354f808ee382',
      name: '',
      sourceBookId: 'qa-empty'
    })

    expect(getAddressBookDisplayName(book, t)).toBe('qa-empty')
  })

  it('falls back to the id of a book named with blanks', () => {
    expect(
      getAddressBookDisplayName(anAddressBook({ id: 'b1', name: '   ' }), t)
    ).toBe('b1')
  })

  it.each([
    { id: 'b1', name: '   ' },
    { id: '', name: '' }
  ])('never labels a book with a blank name: %p', partial => {
    const book = anAddressBook({ canWrite: false, ...partial })

    expect(getAddressBookDisplayName(book, t).trim()).not.toBe('')
  })
})

describe('canShareAddressBook', () => {
  it('lets the owner share the book', () => {
    expect(canShareAddressBook(anAddressBook())).toBe(true)
  })

  it('lets a sharee with administration rights share the book', () => {
    expect(
      canShareAddressBook(
        aSharedBook({ access: AddressBookAccessLevel.Editor })
      )
    ).toBe(true)
  })

  it('does not let a read-write sharee share the book', () => {
    expect(
      canShareAddressBook(
        aSharedBook({ access: AddressBookAccessLevel.ReadWrite })
      )
    ).toBe(false)
  })

  it('does not let a read-only sharee share the book', () => {
    expect(
      canShareAddressBook(
        aSharedBook({ access: AddressBookAccessLevel.Viewer })
      )
    ).toBe(false)
  })

  it('does not let a subscriber of a public read-write book share it', () => {
    expect(canShareAddressBook(aSubscribedBook({ canWrite: true }))).toBe(false)
  })

  it('does not share the domain address book', () => {
    expect(canShareAddressBook(aDomainBook({ name: 'Domain' }))).toBe(false)
  })
})

describe('isContactTransferDestination', () => {
  it('accepts another writable book', () => {
    expect(
      isContactTransferDestination(anAddressBook({ id: 'target' }), 'source')
    ).toBe(true)
  })

  it('accepts the default book', () => {
    expect(isContactTransferDestination(theDefaultBook(), 'source')).toBe(true)
  })

  it('rejects the source book', () => {
    expect(
      isContactTransferDestination(anAddressBook({ id: 'source' }), 'source')
    ).toBe(false)
  })

  it('rejects a read-only book', () => {
    expect(
      isContactTransferDestination(
        anAddressBook({ id: 'readonly', canWrite: false }),
        'source'
      )
    ).toBe(false)
  })

  it('rejects the domain address book', () => {
    // the domain book is writable on the server, still not a destination
    expect(
      isContactTransferDestination(aDomainBook({ canWrite: true }), 'source')
    ).toBe(false)
  })

  it('rejects the internal collected book', () => {
    expect(isContactTransferDestination(theCollectedBook(), 'source')).toBe(
      false
    )
  })
})
