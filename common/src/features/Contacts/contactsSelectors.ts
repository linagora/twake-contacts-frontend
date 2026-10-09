import { createSelector } from '@reduxjs/toolkit'
import { RootState } from '@common/app/store'
import { AddressBook, ContactEntry } from './contactsTypes'

const selectAddressBooks = (state: RootState) => state.contacts.addressBooks

export const selectBook = createSelector(
  [
    selectAddressBooks,
    (_state: RootState, addressBookId?: string) => addressBookId
  ],
  (books, addressBookId) => (addressBookId ? books[addressBookId] : undefined)
)

export type BookScope = 'mine' | 'shared'

const matchesScope = (
  book: AddressBook,
  scope?: BookScope,
  userId?: string
): boolean =>
  !scope ||
  (scope === 'shared'
    ? book.ownerId !== undefined && book.ownerId !== userId && book.id !== 'dab'
    : true)
export const selectContactEntries = createSelector(
  [
    selectAddressBooks,
    (_state: RootState, addressBookId?: string) => addressBookId,
    (_state: RootState, _id?: string, scope?: BookScope) => scope,
    (_state: RootState, _id?: string, _scope?: BookScope, userId?: string) =>
      userId
  ],
  (books, addressBookId, scope, userId): ContactEntry[] => {
    const bookIds = (
      addressBookId ? [addressBookId] : Object.keys(books)
    ).filter(id => books[id] && matchesScope(books[id], scope, userId))
    return bookIds.flatMap(bookId =>
      (books[bookId].contacts ?? []).map(contact => ({
        addressBookId: bookId,
        contact
      }))
    )
  }
)

// books load one after the other, in the same order as selectContactEntries
export const selectBookIdToLoadMore = (
  state: RootState,
  addressBookId?: string,
  scope?: BookScope,
  userId?: string
): string | null => {
  const books = selectAddressBooks(state)
  const bookIds = addressBookId ? [addressBookId] : Object.keys(books)
  return (
    bookIds.find(
      bookId =>
        books[bookId]?.hasMore && matchesScope(books[bookId], scope, userId)
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
      book => book.canWrite && book.id !== 'collected'
    )
)
