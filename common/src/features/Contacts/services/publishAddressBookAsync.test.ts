/** @vitest-environment jsdom */
import reducer, { publishAddressBook } from '../ContactsSlice'
import { ContactsState } from '../contactsTypes'

const arg = { userId: 'owner', addressBookId: 'book' }
const initial: ContactsState = {
  addressBooks: {
    book: {
      id: 'book',
      userId: 'owner',
      name: 'Book',
      contactsCount: 0,
      acl: [],
      canWrite: true,
      contacts: [],
      offset: 0,
      hasMore: false
    }
  },
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
