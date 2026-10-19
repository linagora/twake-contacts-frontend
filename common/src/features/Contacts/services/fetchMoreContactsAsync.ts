import { ReducerCreators } from '@reduxjs/toolkit'
import { RejectedError, toRejectedError } from '@common/utils/errorUtils'
import { fetchContactsPage } from '../ContactsDao'
import { ContactEntry, ContactsState } from '../contactsTypes'
import { ALL_CONTACTS_LISTING } from '../constants'
import { appendListingPage } from '../contactListings'
import { toContactsErrorKey } from '../contactsUtils'

export interface FetchMoreContactsPayload {
  userId: string
  // ALL_CONTACTS_LISTING or an address book id
  listingKey: string
}

/**
 * The page of a listing read after the cursor after, without the contacts of
 * books the app does not list, such as group delegations, as the book list.
 */
export async function fetchListingPage(
  { addressBooks, sort }: ContactsState,
  userId: string,
  listingKey: string,
  after: string | null
): Promise<{ entries: ContactEntry[]; next: string | null }> {
  const { entries, next } = await fetchContactsPage(
    userId,
    addressBooks[listingKey] ?? null,
    { after, sort },
    // without the domain book, its members could not be listed
    addressBooks.dab !== undefined
  )
  return {
    entries: entries.filter(({ addressBookId }) => {
      if (addressBooks[addressBookId]) return true
      console.warn(`Contact of unknown address book ${addressBookId}`)
      return false
    }),
    next
  }
}

export const fetchMoreContactsThunk = (
  create: ReducerCreators<ContactsState>
) =>
  create.asyncThunk<
    { entries: ContactEntry[]; next: string | null; after: string | null },
    FetchMoreContactsPayload,
    { rejectValue: RejectedError }
  >(
    async ({ userId, listingKey }, { getState, rejectWithValue }) => {
      const { contacts } = getState() as { contacts: ContactsState }
      const after = contacts.listings[listingKey]?.next ?? null
      try {
        const page = await fetchListingPage(contacts, userId, listingKey, after)
        return { ...page, after }
      } catch (err) {
        return rejectWithValue(toRejectedError(err))
      }
    },
    {
      options: {
        // endReached can fire again while a page is in flight
        condition: ({ listingKey }, { getState }) => {
          const { addressBooks, listings } = (
            getState() as { contacts: ContactsState }
          ).contacts
          const listing = listings[listingKey]
          return (
            (listingKey === ALL_CONTACTS_LISTING ||
              addressBooks[listingKey] !== undefined) &&
            (!listing || (listing.hasMore && listing.loadingRequestId === null))
          )
        }
      },
      pending: (state, action) => {
        const { listingKey } = action.meta.arg
        state.listings[listingKey] ??= {
          refs: [],
          pages: [],
          next: null,
          hasMore: true,
          loadingRequestId: null
        }
        state.listings[listingKey].loadingRequestId = action.meta.requestId
      },
      fulfilled: (state, action) => {
        const listing = state.listings[action.meta.arg.listingKey]
        // the listing restarted while the page was in flight, as when the
        // books were loaded again
        if (listing?.loadingRequestId !== action.meta.requestId) return
        listing.loadingRequestId = null

        const { entries, next, after } = action.payload
        appendListingPage(state, listing, after, entries)
        listing.next = next
        listing.hasMore = next !== null
      },
      rejected: (state, action) => {
        const { listingKey } = action.meta.arg
        const listing = state.listings[listingKey]
        if (listing?.loadingRequestId !== action.meta.requestId) return
        listing.loadingRequestId = null

        // A cursor the server no longer accepts: the listing restarts from its
        // first page once, a cursor rejected again being reported
        const cursorRejected =
          action.payload?.status === 400 && listing.next !== null
        if (cursorRejected && !listing.restarted) {
          state.listings[listingKey] = {
            refs: [],
            pages: [],
            next: null,
            hasMore: true,
            loadingRequestId: null,
            restarted: true
          }
          return
        }
        // the api already retried: the listing stops until the next reload
        listing.hasMore = false
        if (action.payload?.status !== 401) {
          state.error = toContactsErrorKey(
            action.payload,
            'contacts.errors.load'
          )
        }
      }
    }
  )
