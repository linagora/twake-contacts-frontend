import { configureStore } from '@reduxjs/toolkit'
// TODO: adjust to how your slice exports its reducer and thunks
import contactsReducer, {
  fetchMoreContacts,
  fetchUpdatedContacts
} from '@common/features/Contacts/ContactsSlice'
import type { Contact } from '../contactsTypes'
import { fetchPaginatedContacts } from './fetchPaginatedContacts'

jest.mock('./fetchPaginatedContacts')
const mockedFetch = jest.mocked(fetchPaginatedContacts)
jest.setTimeout(30_000)

const BOOK_ID = 'book1'
const USER_ID = 'user1'
const RUNS = 50
const MAX_CONTACTS = 1500

// Random input generation (seeded, so a failure can be replayed)
function makeRandom(seed: number): () => number {
  let a = seed
  return (): number => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const randomInt = (rand: () => number, min: number, max: number): number =>
  min + Math.floor(rand() * (max - min + 1))

const randomName = (rand: () => number): string =>
  `name-${randomInt(rand, 0, 9999)}`

function randomContacts(rand: () => number, size: number): Contact[] {
  return Array.from({ length: size }, (_, i) => ({
    id: `c${i}`,
    displayName: randomName(rand),
    emails: []
  }))
}

// live server we can change between steps
interface ServerModel {
  contacts: Contact[]
  token: number
}

// Adds, deletes and edits a few contacts at random positions (the real server
// sorts by name, so an insert can land anywhere and shift every later page),
// then bumps the sync token like the real server does.
function mutateServer(
  rand: () => number,
  server: ServerModel,
  nextId: { n: number }
): void {
  const ops = randomInt(rand, 1, 5)
  for (let k = 0; k < ops; k++) {
    const list = server.contacts
    const kind = rand()
    if (kind < 0.4 || list.length === 0) {
      list.splice(randomInt(rand, 0, list.length), 0, {
        id: `n${nextId.n++}`,
        displayName: randomName(rand),
        emails: []
      })
    } else if (kind < 0.7) {
      list.splice(randomInt(rand, 0, list.length - 1), 1)
    } else {
      const at = randomInt(rand, 0, list.length - 1)
      list[at] = {
        ...list[at],
        displayName: `edited-${randomInt(rand, 0, 9999)}`
      }
    }
  }
  server.token++
}

// Serves the server's CURRENT contents page by page. `maxPageSize` simulates a
// server that returns fewer items than requested.
function fakeLiveServer(server: ServerModel, maxPageSize: number): void {
  mockedFetch.mockImplementation(async (_book, _userId, limit, offset) => {
    const page = server.contacts.slice(
      offset,
      offset + Math.min(limit, maxPageSize)
    )
    const end = offset + page.length
    return {
      contacts: page,
      offset: end,
      hasMore: end < server.contacts.length,
      syncToken: server.token
    }
  })
}

// A store with one address book where nothing has been loaded yet
function makeStore(syncToken: number) {
  return configureStore({
    reducer: { contacts: contactsReducer },
    // These dev checks walk the whole state on every action: far too slow
    // with 1500 contacts, and not what we are testing here
    middleware: getDefaultMiddleware =>
      getDefaultMiddleware({ immutableCheck: false, serializableCheck: false }),
    preloadedState: {
      contacts: {
        addressBooks: {
          [BOOK_ID]: {
            id: BOOK_ID,
            userId: USER_ID,
            name: 'Book',
            contactsCount: null,
            acl: [],
            canWrite: true,
            contacts: [],
            offset: 0,
            hasMore: true,
            syncToken,
            isLoadingMore: false
          }
        },
        loading: false,
        error: null
      }
    }
  })
}

const loadMore = () => fetchMoreContacts({ userId: USER_ID, bookId: BOOK_ID })
const refresh = (newSyncToken: number) =>
  fetchUpdatedContacts({ userId: USER_ID, bookId: BOOK_ID, newSyncToken })

const getBook = (store: ReturnType<typeof makeStore>) =>
  store.getState().contacts.addressBooks[BOOK_ID]

type Book = ReturnType<typeof getBook>

// When the client is in sync, the loaded contacts are EXACTLY the first
// `offset` contacts of the server. That one rule rules out duplicates, holes,
// wrong order, stale edits and incoherent paging state. Returns a description
// of the first problem found, or null.
function checkInSync(book: Book, server: ServerModel): string | null {
  const { contacts, offset, hasMore, syncToken, isLoadingMore } = book

  if (isLoadingMore) return 'isLoadingMore is still true'
  if (contacts.length !== offset) {
    return `contacts.length=${contacts.length} but offset=${offset}`
  }
  // Nothing loaded yet: paging state is not meaningful, the next load sets it
  if (offset === 0) return null

  if (offset > server.contacts.length) {
    return `offset=${offset} is beyond the server size ${server.contacts.length}`
  }
  for (let i = 0; i < contacts.length; i++) {
    const got = contacts[i]
    const want = server.contacts[i]
    if (got.id !== want.id || got.displayName !== want.displayName) {
      return `contact #${i} is ${got.id}/${got.displayName}, server has ${want.id}/${want.displayName}`
    }
  }
  if (hasMore !== offset < server.contacts.length) {
    return `hasMore=${hasMore} but offset=${offset} and server size=${server.contacts.length}`
  }
  if (syncToken !== server.token) {
    return `syncToken=${syncToken} but server token=${server.token}`
  }
  return null
}

// Properties
describe('lazy load + partial refresh (random sequences, large data)', () => {
  it('stays in sync with the server through many lazy loads and refreshes', async () => {
    for (let seed = 1; seed <= RUNS; seed++) {
      const rand = makeRandom(seed)
      const server: ServerModel = {
        contacts: randomContacts(rand, randomInt(rand, 0, MAX_CONTACTS)),
        token: 10
      }
      const nextId = { n: 0 }
      fakeLiveServer(server, randomInt(rand, 5, 100))
      const store = makeStore(server.token)
      const log: string[] = []

      const steps = randomInt(rand, 20, 80)
      for (let step = 1; step <= steps; step++) {
        if (rand() < 0.7) {
          // the user scrolls: next page
          log.push('loadMore')
          await store.dispatch(loadMore())
        } else {
          // something changes on the server and the push arrives
          const before = server.contacts.length
          mutateServer(rand, server, nextId)
          log.push(`push(${before}->${server.contacts.length})`)
          await store.dispatch(refresh(server.token))
        }

        const problem = checkInSync(getBook(store), server)
        if (problem) {
          throw new Error(
            `seed=${seed} step=${step}\nactions: ${log.join(' > ')}\n${problem}`
          )
        }
      }
    }
  })

  it('never corrupts the state when a lazy load races with a refresh', async () => {
    for (let seed = 1; seed <= RUNS; seed++) {
      const rand = makeRandom(seed)
      const server: ServerModel = {
        contacts: randomContacts(rand, randomInt(rand, 50, MAX_CONTACTS)),
        token: 10
      }
      const nextId = { n: 0 }
      fakeLiveServer(server, randomInt(rand, 5, 100))
      const store = makeStore(server.token)

      const pages = randomInt(rand, 1, 5)
      for (let i = 0; i < pages; i++) await store.dispatch(loadMore())

      mutateServer(rand, server, nextId)

      // Both fired in the same tick, like a scroll event during a push.
      // One of them is skipped by the thunk's `condition`; whichever runs
      // must leave the state valid.
      const refreshFirst = rand() < 0.5
      const first = store.dispatch(
        refreshFirst ? refresh(server.token) : loadMore()
      )
      const second = store.dispatch(
        refreshFirst ? loadMore() : refresh(server.token)
      )
      await Promise.all([first, second])

      const book = getBook(store)
      const ids = book.contacts.map(c => c.id)
      try {
        expect(new Set(ids).size).toBe(ids.length) // no duplicate keys
        expect(book.isLoadingMore).toBe(false) // flag released
      } catch (e) {
        throw new Error(
          `seed=${seed} refreshFirst=${refreshFirst}\n${e instanceof Error ? e.message : String(e)}`,
          { cause: e }
        )
      }
    }
  })
})
