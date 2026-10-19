import { ReducerCreators } from '@reduxjs/toolkit'
import { RejectedError, toRejectedError } from '@common/utils/errorUtils'
import { ContactEntry, ContactSort, ContactsState } from '../contactsTypes'
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
  sort: ContactSort
}

// an empty listing, as the one of an empty book, starts its first page there
const LISTING_START = { after: null, refIndex: 0 }

async function reloadListingEnd(
  contacts: ContactsState,
  userId: string,
  listingKey: string
): Promise<ReloadedListing> {
  const pageCount = contacts.listings[listingKey].pages.length
  const fromPage = Math.max(0, pageCount - RELOADED_PAGES)
  const pages: ReloadedListing['pages'] = []
  let after = (contacts.listings[listingKey].pages[fromPage] ?? LISTING_START)
    .after
  let next: string | null = null
  while (pages.length < Math.max(1, pageCount - fromPage)) {
    const page = await fetchListingPage(contacts, userId, listingKey, after)
    pages.push({ after, entries: page.entries })
    next = page.next
    if (next === null) break
    after = next
  }
  return { listingKey, pageCount, fromPage, pages, next, sort: contacts.sort }
}

// false when the reload is dropped, the listing keeping its old contacts
function replaceListingEnd(
  state: ContactsState,
  { listingKey, pageCount, fromPage, pages, next, sort }: ReloadedListing
): boolean {
  // the listings restarted in another order meanwhile
  if (state.sort.by !== sort.by || state.sort.order !== sort.order) {
    return false
  }
  const listing = state.listings[listingKey]
  const start = listing?.pages[fromPage] ?? LISTING_START
  // the listing restarted or another page came meanwhile
  if (
    listing?.pages.length !== pageCount ||
    start.after !== pages[0]?.after ||
    listing.loadingRequestId !== null
  ) {
    return false
  }
  listing.refs = listing.refs.slice(0, start.refIndex)
  listing.pages = listing.pages.slice(0, fromPage)
  for (const page of pages) {
    appendListingPage(state, listing, page.after, page.entries)
  }
  listing.next = next
  listing.hasMore = next !== null
  return true
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
            .filter(key => contacts.listings[key] !== undefined)
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
        const applied = action.payload.map(reloaded =>
          replaceListingEnd(state, reloaded)
        )
        // the token moves once every listing shows the change: the same push
        // reloads again a listing whose reload was dropped
        const book = state.addressBooks[action.meta.arg.bookId]
        if (book && applied.every(Boolean)) {
          book.syncToken = action.meta.arg.newSyncToken
        }
      }
      // a failed reload leaves the listings as they were, until the next change
    }
  )
