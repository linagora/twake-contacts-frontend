import { classifyAddressBook } from '@common/features/Contacts/addressBookModel'
/** @vitest-environment jsdom */
import reducer, { publishAddressBook } from '../ContactsSlice'
import { ContactsState } from '../contactsTypes'
import { DEFAULT_CONTACT_SORT } from '../constants'

const arg = { userId: 'owner', addressBookId: 'book' }
const initial: ContactsState = {
  addressBooks: {
    book: classifyAddressBook(
      {
        id: 'book',
        userId: 'owner',
        name: 'Book',
        contactsCount: 0,
        acl: [],
        canWrite: true,
        contacts: []
      },
      'owner'
    )
  },
  listings: {},
  sort: DEFAULT_CONTACT_SORT,
  loading: false,
  error: null
}

it.each([
  [403, 'contacts.errors.forbidden'],
  [500, 'contacts.errors.share'],
  [401, null]
])('maps publication failure %s', (status, expected) => {
  const state = reducer(
    initial,
    publishAddressBook.rejected(
      null,
      'request',
      { ...arg, publish: true },
      {
        message: 'Request failed',
        status
      }
    )
  )
  expect(state.error).toBe(expected)
})
