import type { Mock } from 'vitest'
import { renderHook } from '@testing-library/react'
import { Provider } from 'react-redux'
import { setupStore } from '@common/app/store'
import { UserState } from '@common/features/User/UserSlice'
import { searchContacts } from '../ContactsDao'
import { AddressBook } from '../contactsTypes'
import { DEFAULT_CONTACT_SORT } from '../constants'
import { useContactSearch } from './useContactSearch'

vi.mock('../ContactsDao')

const mockedSearchContacts = searchContacts as Mock

const book = (id: string, userId: string): AddressBook => ({
  id,
  userId,
  name: id,
  contactsCount: 0,
  acl: [],
  canWrite: false
})

function renderSearch(
  addressBooks: Record<string, AddressBook>
): (search: string) => Promise<unknown> {
  const store = setupStore({
    user: { userData: { openpaasId: 'u1' } } as UserState,
    contacts: {
      addressBooks,
      listings: {},
      sort: DEFAULT_CONTACT_SORT,
      loading: false,
      error: null
    }
  })
  const { result } = renderHook(() => useContactSearch(), {
    wrapper: ({ children }) => <Provider store={store}>{children}</Provider>
  })
  return result.current
}

describe('useContactSearch', () => {
  it('resolves to no entry without calling the backend for a blank search', async () => {
    const search = renderSearch({ contacts: book('contacts', 'u1') })

    await expect(search('   ')).resolves.toEqual([])
    expect(mockedSearchContacts).not.toHaveBeenCalled()
  })

  it('resolves to no entry without calling the backend when no book is loaded', async () => {
    const search = renderSearch({})

    await expect(search('alice')).resolves.toEqual([])
    expect(mockedSearchContacts).not.toHaveBeenCalled()
  })

  it('searches the domain book as domain-members and maps its results back to dab', async () => {
    const contact = { id: 'c1', displayName: 'Alice' }
    mockedSearchContacts.mockResolvedValue([
      { addressBookId: 'domain-members', contact },
      { addressBookId: 'contacts', contact }
    ])
    const search = renderSearch({
      dab: book('dab', 'd1'),
      contacts: book('contacts', 'u1')
    })

    await expect(search('alice')).resolves.toEqual([
      { addressBookId: 'dab', contact },
      { addressBookId: 'contacts', contact }
    ])
    expect(mockedSearchContacts).toHaveBeenCalledWith(
      [
        { userId: 'd1', addressBookId: 'domain-members' },
        { userId: 'u1', addressBookId: 'contacts' }
      ],
      'alice'
    )
  })
})
