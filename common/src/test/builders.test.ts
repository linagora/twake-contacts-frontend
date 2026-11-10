import { matchesScope } from '@common/features/Contacts/contactsSelectors'
import {
  getAddressBookDisplayName,
  isHiddenAddressBook,
  isWritableTargetBook
} from '@common/features/Contacts/contactsUtils'
import { AddressBookAccessLevel } from '@common/features/Contacts/davTypes'
import {
  TEST_USER_ID,
  aContact,
  aDomainBook,
  aListing,
  aRef,
  aSharedBook,
  aStoreState,
  aSubscribedBook,
  anAddressBook,
  byId,
  theCollectedBook,
  theDefaultBook
} from './builders'

const t = (key: string): string => key

// the presets must stay what the app recognises them as
describe('builders', () => {
  it('builds a writable book of the test user', () => {
    const book = anAddressBook()

    expect(matchesScope(book, 'onlyMine')).toBe(true)
    expect(isWritableTargetBook(book)).toBe(true)
    expect(book.capabilities.share).toBe(true)
  })

  it('counts the contacts of a book', () => {
    expect(anAddressBook({ contacts: [aContact()] }).contactsCount).toBe(1)
  })

  it('builds the default and the collected books as hidden books', () => {
    expect(isHiddenAddressBook(theDefaultBook().id)).toBe(true)
    expect(getAddressBookDisplayName(theDefaultBook(), t)).toBe(
      'contacts.myContacts'
    )
    expect(isHiddenAddressBook(theCollectedBook().id)).toBe(true)
    expect(isWritableTargetBook(theCollectedBook())).toBe(false)
  })

  it('builds the domain book', () => {
    const book = aDomainBook()

    expect(getAddressBookDisplayName(book, t)).toBe(
      'contacts.domainAddressBook'
    )
    expect(matchesScope(book, 'shared')).toBe(false)
    expect(matchesScope(book, 'onlyMine')).toBe(false)
  })

  it.each([
    [AddressBookAccessLevel.Viewer, false],
    [AddressBookAccessLevel.ReadWrite, true],
    [AddressBookAccessLevel.Editor, true]
  ])('builds a shared book writable by access %i: %s', (access, canWrite) => {
    const book = aSharedBook({ access })

    expect(matchesScope(book, 'shared')).toBe(true)
    expect(book.canWrite).toBe(canWrite)
  })

  it('builds a read-only subscribed book shared with the test user', () => {
    const book = aSubscribedBook()

    expect(matchesScope(book, 'shared')).toBe(true)
    expect(isWritableTargetBook(book)).toBe(false)
    expect(book.capabilities.share).toBe(false)
  })

  it('builds a last-page listing unless given a next cursor', () => {
    const ref = aRef('book1', aContact())

    expect(aListing([ref]).hasMore).toBe(false)
    expect(aListing([ref], { next: 'cursor' }).hasMore).toBe(true)
  })

  it('builds a loaded store state with the given books', () => {
    const book = anAddressBook()

    const state = aStoreState({ contacts: { addressBooks: byId(book) } })

    expect(state.contacts.addressBooks).toStrictEqual({ book1: book })
    expect(state.contacts.loading).toBe(false)
    expect(state.user.userData.openpaasId).toBe(TEST_USER_ID)
  })
})
