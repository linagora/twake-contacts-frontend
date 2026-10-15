import { ReducerCreators } from '@reduxjs/toolkit'
import { RejectedError, toRejectedError } from '@common/utils/errorUtils'
import { ContactEntry, ContactsState } from '../contactsTypes'
import { ALL_CONTACTS_LISTING } from '../constants'
import { appendListingPage } from '../contactListings'
import { fetchListingPage } from './fetchMoreContactsAsync'

export interface FetchUpdatedContactsPayload {
  userId: string
  bookId: string
  newSyncToken: number
}

// ponytail: only the last pages show a change, as the ones on screen after
// scrolling; changes above them wait for a reload. The precise way is the
// sync-token REPORT of the book (linagora/esn-sabre#459) applying its changes
const RELOADED_PAGES = 2

interface ReloadedListing {
  listingKey: string
  // pages of the listing when the reload started and first one reloaded
  pageCount: number
  fromPage: number
  pages: { after: string | null; entries: ContactEntry[] }[]
  next: string | null
}

async function reloadListingEnd(
  contacts: ContactsState,
  userId: string,
  listingKey: string
): Promise<ReloadedListing> {
  const pageCount = contacts.listings[listingKey].pages.length
  const fromPage = Math.max(0, pageCount - RELOADED_PAGES)
  const pages: ReloadedListing['pages'] = []
  let after = contacts.listings[listingKey].pages[fromPage].after
  let next: string | null = null
  while (pages.length < pageCount - fromPage) {
    const page = await fetchListingPage(contacts, userId, listingKey, after)
    pages.push({ after, entries: page.entries })
    next = page.next
    if (next === null) break
    after = next
  }
  return { listingKey, pageCount, fromPage, pages, next }
}

function replaceListingEnd(
  state: ContactsState,
  { listingKey, pageCount, fromPage, pages, next }: ReloadedListing
): void {
  const listing = state.listings[listingKey]
  // the listing restarted or another page came meanwhile
  if (
    listing?.pages.length !== pageCount ||
    listing.pages[fromPage].after !== pages[0]?.after ||
    listing.loadingRequestId !== null
  ) {
    return
  }
  listing.refs = listing.refs.slice(0, listing.pages[fromPage].refIndex)
  listing.pages = listing.pages.slice(0, fromPage)
  for (const page of pages) {
    appendListingPage(state, listing, page.after, page.entries)
  }
  listing.next = next
  listing.hasMore = next !== null
}

// A change in a book, pushed by the server, reloads the last pages of the
// listings showing it: its own and every book one
export const fetchUpdatedContactsThunk = (
  create: ReducerCreators<ContactsState>
) =>
  create.asyncThunk<
    ReloadedListing[],
    FetchUpdatedContactsPayload,
    { rejectValue: RejectedError }
  >(
    async ({ userId, bookId }, { getState, rejectWithValue }) => {
      const { contacts } = getState() as { contacts: ContactsState }
      try {
        return await Promise.all(
          [bookId, ALL_CONTACTS_LISTING]
            .filter(key => (contacts.listings[key]?.pages.length ?? 0) > 0)
            .map(key => reloadListingEnd(contacts, userId, key))
        )
      } catch (err) {
        return rejectWithValue(toRejectedError(err))
      }
    },
    {
      options: {
        // an unknown book, or a change already loaded
        condition: ({ bookId, newSyncToken }, { getState }) => {
          const book = (getState() as { contacts: ContactsState }).contacts
            .addressBooks[bookId]
          return book !== undefined && book.syncToken !== newSyncToken
        }
      },
      fulfilled: (state, action) => {
        const book = state.addressBooks[action.meta.arg.bookId]
        if (book) book.syncToken = action.meta.arg.newSyncToken
        for (const reloaded of action.payload) {
          replaceListingEnd(state, reloaded)
        }
      }
      // a failed reload leaves the listings as they were, until the next change
    }
  )
