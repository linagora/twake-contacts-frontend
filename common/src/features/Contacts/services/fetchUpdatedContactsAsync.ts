import { ReducerCreators } from '@reduxjs/toolkit'
import { RejectedError, toRejectedError } from '@common/utils/errorUtils'
import { ContactsState, Contact } from '../contactsTypes'
import { CONTACTS_PAGINATION_LIMIT } from '../constants'
import { toContactsErrorKey } from '../contactsUtils'
import { fetchPaginatedContacts } from './fetchPaginatedContacts'

export interface FetchUpdatedContactsPayload {
  userId: string
  bookId: string
  newSyncToken: number
}

type FetchUpdatedContactsResult =
  | { bookId: string; updated: false }
  | {
      bookId: string
      updated: true
      contacts: Contact[]
      offset: number
      hasMore: boolean
      syncToken: number
    }

export const fetchUpdatedContactsThunk = (
  create: ReducerCreators<ContactsState>
) =>
  create.asyncThunk<
    FetchUpdatedContactsResult,
    FetchUpdatedContactsPayload,
    { rejectValue: RejectedError }
  >(
    async ({ userId, bookId, newSyncToken }, { getState, rejectWithValue }) => {
      try {
        const state = getState() as { contacts: ContactsState }
        const book = state.contacts.addressBooks[bookId]

        // Unknown book, nothing loaded yet (the initial fetch will see the
        // changes), or already up to date
        if (!book || book.offset === 0 || book.syncToken === newSyncToken) {
          return { bookId, updated: false }
        }

        // Re-fetch only the window already loaded: [0, book.offset).
        // Done page by page so a server-side cap on `limit` can't truncate it.
        const target = book.offset
        const contacts: Contact[] = []
        let offset = 0
        let hasMore = true
        // Keep the token of the FIRST page: later pages may be newer, and
        // storing a newer token than the oldest data we hold could hide a change
        let syncToken: number | undefined

        while (offset < target && hasMore) {
          const page = await fetchPaginatedContacts(
            book,
            userId,
            Math.min(CONTACTS_PAGINATION_LIMIT, target - offset),
            offset
          )
          syncToken ??= page.syncToken
          contacts.push(...page.contacts)
          offset = page.offset
          hasMore = page.hasMore
          if (page.contacts.length === 0) break
        }

        return {
          bookId,
          updated: true,
          contacts,
          offset,
          hasMore,
          syncToken: syncToken ?? newSyncToken
        }
      } catch (err) {
        return rejectWithValue(toRejectedError(err))
      }
    },
    {
      options: {
        // Don't run concurrently with a page load or another refresh
        condition: ({ bookId }, { getState }) => {
          const state = getState() as { contacts: ContactsState }
          return !state.contacts.addressBooks[bookId]?.isLoadingMore
        }
      },
      pending: (state, action) => {
        const book = state.addressBooks[action.meta.arg.bookId]
        if (book) book.isLoadingMore = true
      },
      settled: (state, action) => {
        const book = state.addressBooks[action.meta.arg.bookId]
        if (book) book.isLoadingMore = false
      },
      fulfilled: (state, action) => {
        if (!action.payload.updated) return

        const { bookId, contacts, offset, hasMore, syncToken } = action.payload
        const book = state.addressBooks[bookId]
        if (!book) return

        // Replace the loaded window wholesale: edits, deletions and
        // re-sorted contacts all come out right, and no duplicate keys
        book.contacts = contacts
        book.offset = offset
        book.hasMore = hasMore
        book.syncToken = syncToken
      },
      rejected: (state, action) => {
        if (action.payload?.status !== 401) {
          state.error = toContactsErrorKey(
            action.payload,
            'contacts.errors.load'
          )
        }
      }
    }
  )
