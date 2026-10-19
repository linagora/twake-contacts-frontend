import { createSelector } from '@reduxjs/toolkit'
import { RootState } from '@common/app/store'
import { ALL_CONTACTS_LISTING } from './constants'
import { makeContactLookup } from './contactListings'
import {
  AddressBook,
  AddressBookWithContacts,
  ContactEntry
} from './contactsTypes'

const selectAddressBooks = (state: RootState) => state.contacts.addressBooks
const selectListings = (state: RootState) => state.contacts.listings

export const selectBook = createSelector(
  [
    selectAddressBooks,
    (_state: RootState, addressBookId?: string) => addressBookId
  ],
  (books, addressBookId) => (addressBookId ? books[addressBookId] : undefined)
)

export type BookScope = 'mine' | 'shared' | 'onlyMine'

export const matchesScope = (
  book: AddressBook,
  scope?: BookScope,
  userId?: string
): boolean => {
  switch (scope) {
    case 'shared':
      return (
        book.ownerId !== undefined &&
        book.ownerId !== userId &&
        book.id !== 'dab'
      )
    case 'onlyMine':
      return (
        (book.ownerId === undefined || book.ownerId === userId) &&
        book.id !== 'dab'
      )

    default:
      return true
  }
}

// The server lists the contacts of every book, but not those of some books
// only: these are shown book after book
const getViewListingKeys = (
  books: Record<string, AddressBookWithContacts>,
  addressBookId?: string,
  scope?: BookScope,
  userId?: string
): string[] => {
  if (addressBookId) return [addressBookId]
  if (scope && scope !== 'mine') {
    return Object.keys(books).filter(id =>
      matchesScope(books[id], scope, userId)
    )
  }
  return [ALL_CONTACTS_LISTING]
}

const selectViewListingKeys = createSelector(
  [
    selectAddressBooks,
    (_state: RootState, addressBookId?: string) => addressBookId,
    (_state: RootState, _id?: string, scope?: BookScope) => scope,
    (_state: RootState, _id?: string, _scope?: BookScope, userId?: string) =>
      userId
  ],
  getViewListingKeys
)

export const selectContactEntries = createSelector(
  [selectAddressBooks, selectListings, selectViewListingKeys],
  (books, listings, listingKeys): ContactEntry[] => {
    const findContact = makeContactLookup(books)
    const entries: ContactEntry[] = []
    for (const key of listingKeys) {
      const listing = listings[key]
      if (!listing) break
      for (const ref of listing.refs) {
        const contact = findContact(ref)
        if (contact) entries.push({ addressBookId: ref.addressBookId, contact })
      }
      // a listing shows once the previous ones are complete, so that loading
      // it adds rows at the end only
      if (listing.hasMore) break
    }
    return entries
  }
)

// the first listing of the view with more contacts to load
export const selectListingKeyToLoadMore = (
  state: RootState,
  addressBookId?: string,
  scope?: BookScope,
  userId?: string
): string | null => {
  const listings = selectListings(state)
  return (
    selectViewListingKeys(state, addressBookId, scope, userId).find(
      key => !listings[key] || listings[key].hasMore
    ) ?? null
  )
}

export const selectCategories = createSelector(
  [selectAddressBooks],
  (books): string[] => [
    ...new Set(
      Object.values(books).flatMap(book =>
        book.contacts.flatMap(contact => contact.categories ?? [])
      )
    )
  ]
)

export const selectWritableBooks = createSelector(
  [selectAddressBooks],
  (books): AddressBook[] =>
    Object.values(books).filter(
      // the domain book is writable but must not be edited from here
      book => book.canWrite && book.id !== 'collected' && book.id !== 'dab'
    )
)
