import type { Mock } from 'vitest'
import { renderHook } from '@testing-library/react'
import { Provider } from 'react-redux'
import { setupStore } from '@common/app/store'
import { UserState } from '@common/features/User/UserSlice'
import { classifyAddressBook } from '../addressBookModel'
import { searchContacts } from '../ContactsDao'
import { AddressBookWithContacts } from '../contactsTypes'
import { DEFAULT_CONTACT_SORT } from '../constants'
import { useContactSearch } from './useContactSearch'

vi.mock('../ContactsDao')

const mockedSearchContacts = searchContacts as Mock

const book = (id: string, userId: string): AddressBookWithContacts =>
  classifyAddressBook(
    {
      id,
      userId,
      name: id,
      contactsCount: 0,
      acl: [],
      canWrite: false,
      contacts: []
    },
    'u1'
  )

function renderSearch(
  addressBooks: Record<string, AddressBookWithContacts>
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

  // the DAO maps the domain book to the id of its members, see ContactsDao.test.ts
  it('searches every book of the store and resolves to the entries of the DAO', async () => {
    const contact = { id: 'c1', displayName: 'Alice' }
    const entries = [{ addressBookId: 'dab', contact }]
    mockedSearchContacts.mockResolvedValue(entries)
    const domainBook = book('dab', 'd1')
    const ownBook = book('contacts', 'u1')
    const search = renderSearch({ dab: domainBook, contacts: ownBook })

    await expect(search('alice')).resolves.toEqual(entries)
    expect(mockedSearchContacts).toHaveBeenCalledWith(
      [domainBook, ownBook],
      'alice'
    )
  })
})
