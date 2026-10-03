import { ReducerCreators } from '@reduxjs/toolkit'
import { RejectedError, toRejectedError } from '@common/utils/errorUtils'
import { ContactsState, Contact } from '../contactsTypes'
import { CONTACTS_PAGINATION_LIMIT } from '../constants'
import { toContactsErrorKey } from '../contactsUtils'
import { fetchPaginatedContacts } from './fetchPaginatedContacts'

export interface FetchMoreContactsPayload {
  userId: string
  bookId: string
}

export const fetchMoreContactsThunk = (
  create: ReducerCreators<ContactsState>
) =>
  create.asyncThunk<
    { bookId: string; contacts: Contact[]; offset: number; hasMore: boolean },
    FetchMoreContactsPayload,
    { rejectValue: RejectedError }
  >(
    async ({ userId, bookId }, { getState, rejectWithValue }) => {
      try {
        const state = getState() as { contacts: ContactsState }
        const bookWithContacts = state.contacts.addressBooks[bookId]

        if (!bookWithContacts || !bookWithContacts.hasMore) {
          return {
            bookId,
            contacts: [],
            offset: bookWithContacts?.offset || 0,
            hasMore: false
          }
        }

        const result = await fetchPaginatedContacts(
          bookWithContacts,
          userId,
          CONTACTS_PAGINATION_LIMIT,
          bookWithContacts.offset
        )

        return {
          bookId,
          contacts: result.contacts,
          offset: result.offset,
          hasMore: result.hasMore
        }
      } catch (err) {
        return rejectWithValue(toRejectedError(err))
      }
    },
    {
      options: {
        // endReached can fire again while a page is in flight
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
        const { bookId, contacts, offset, hasMore } = action.payload
        const book = state.addressBooks[bookId]
        if (book) {
          // Pages are fetched by offset, so a contact added while paging
          // can come back in the next page; a repeated contact would
          // give the table duplicate keys
          // // Also handle contacts added from search that may be out of position
          const toRemove = new Set<string>()
          for (const contact of contacts) {
            const existingIndex = book.contacts.findIndex(
              c => c.id === contact.id
            )
            if (existingIndex !== -1) {
              toRemove.add(contact.id)
            }
          }
          // Remove contacts that will be re-fetched in correct position
          book.contacts = book.contacts.filter(c => !toRemove.has(c.id))
          // Add all new contacts in their proper sorted position
          book.contacts.push(...contacts)
          book.offset = offset
          book.hasMore = hasMore
        }
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
