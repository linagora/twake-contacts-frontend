/** @vitest-environment jsdom */
import { setupStore } from '@common/app/store'
import { userData } from '@common/features/User/userDataTypes'
import reducer, {
  addressBookDetailReceived,
  addressBookMemberResolved,
  fetchAddressBookDetail
} from '../ContactsSlice'
import {
  fetchAddressBookDetails,
  resolveAddressBookMember
} from '../ContactsDao'
import { ContactsState } from '../contactsTypes'
import { AddressBookAccessLevel } from '../davTypes'

vi.mock('../ContactsDao')

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
      contacts: []
    }
  },
  listings: {},
  sort: { by: 'fn', order: 'asc' },
  loading: false,
  error: null
}

const invitedBob: userData = {
  email: 'bob@open-paas.org',
  family_name: '',
  given_name: '',
  name: 'bob@open-paas.org',
  sid: 'bob',
  sub: 'bob',
  openpaasId: 'bob',
  role: AddressBookAccessLevel.Viewer,
  href: 'mailto:bob@open-paas.org'
}
const resolvedBob: userData = { ...invitedBob, name: 'bob bob' }

it('ignores an older detail response after the latest response', () => {
  let state = reducer(initial, fetchAddressBookDetail.pending('old', arg))
  state = reducer(state, fetchAddressBookDetail.pending('new', arg))
  state = reducer(
    state,
    addressBookDetailReceived({
      addressBookId: 'book',
      requestId: 'new',
      members: [],
      isPublic: true
    })
  )
  state = reducer(
    state,
    addressBookDetailReceived({
      addressBookId: 'book',
      requestId: 'old',
      members: [invitedBob],
      isPublic: false
    })
  )
  state = reducer(
    state,
    addressBookMemberResolved({
      addressBookId: 'book',
      requestId: 'old',
      member: resolvedBob
    })
  )
  expect(state.addressBooks.book.isPublic).toBe(true)
  expect(state.addressBooks.book.invitedMembers).toEqual([])
})

it('tracks requests independently for each address book', () => {
  let state = reducer(
    initial,
    fetchAddressBookDetail.pending('book-request', arg)
  )
  state = reducer(
    state,
    fetchAddressBookDetail.pending('other-request', {
      ...arg,
      addressBookId: 'other'
    })
  )
  state = reducer(
    state,
    addressBookDetailReceived({
      addressBookId: 'book',
      requestId: 'book-request',
      members: [],
      isPublic: true
    })
  )
  expect(state.addressBooks.book.isPublic).toBe(true)
})

it('keeps the known profile of a member listed again, with its new role', () => {
  const request = { addressBookId: 'book', requestId: 'refresh' }
  let state = reducer(
    {
      ...initial,
      addressBooks: {
        book: { ...initial.addressBooks.book, invitedMembers: [resolvedBob] }
      }
    },
    fetchAddressBookDetail.pending('refresh', { ...arg, silent: true })
  )
  state = reducer(
    state,
    addressBookDetailReceived({
      ...request,
      members: [{ ...invitedBob, role: AddressBookAccessLevel.Editor }],
      isPublic: false,
      silent: true
    })
  )
  expect(state.addressBooks.book.invitedMembers).toEqual([
    { ...resolvedBob, role: AddressBookAccessLevel.Editor }
  ])
})

describe('fetchAddressBookDetail', () => {
  afterEach(() => vi.resetAllMocks())

  it('lists the members before their profiles are looked up', async () => {
    vi.mocked(fetchAddressBookDetails).mockResolvedValue({
      members: [invitedBob],
      isPublic: false
    })
    let answerLookup!: (member: userData) => void
    vi.mocked(resolveAddressBookMember).mockReturnValue(
      new Promise(resolve => {
        answerLookup = resolve
      })
    )
    const store = setupStore({ contacts: initial })

    const request = store.dispatch(fetchAddressBookDetail(arg))
    await vi.mocked(fetchAddressBookDetails).mock.results[0].value
    await Promise.resolve()

    expect(store.getState().contacts.detailsLoading).toBe(false)
    expect(store.getState().contacts.addressBooks.book.invitedMembers).toEqual([
      invitedBob
    ])

    answerLookup(resolvedBob)
    await request

    expect(store.getState().contacts.addressBooks.book.invitedMembers).toEqual([
      resolvedBob
    ])
  })

  it('keeps the known profile of a member whose lookup fails', async () => {
    vi.mocked(fetchAddressBookDetails).mockResolvedValue({
      members: [invitedBob],
      isPublic: false
    })
    vi.mocked(resolveAddressBookMember).mockImplementation(m =>
      Promise.resolve(m)
    )
    const store = setupStore({
      contacts: {
        ...initial,
        addressBooks: {
          book: { ...initial.addressBooks.book, invitedMembers: [resolvedBob] }
        }
      }
    })

    await store.dispatch(fetchAddressBookDetail({ ...arg, silent: true }))

    expect(store.getState().contacts.addressBooks.book.invitedMembers).toEqual([
      resolvedBob
    ])
  })

  it('leaves the contact list error alone when the details cannot be fetched', async () => {
    vi.mocked(fetchAddressBookDetails).mockRejectedValue(
      new Error('Bad Request')
    )
    const store = setupStore({ contacts: initial })

    await store.dispatch(fetchAddressBookDetail(arg))

    expect(store.getState().contacts.error).toBeNull()
    expect(store.getState().contacts.detailsLoading).toBe(false)
  })
})
