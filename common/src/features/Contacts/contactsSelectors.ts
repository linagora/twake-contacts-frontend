import { createSelector } from '@reduxjs/toolkit'
import { RootState } from '@common/app/store'
import { ContactEntry } from './contactsTypes'

const selectAddressBooks = (state: RootState) => state.contacts.addressBooks

export const selectBook = createSelector(
  [
    selectAddressBooks,
    (_state: RootState, addressBookId?: string) => addressBookId
  ],
  (books, addressBookId) => (addressBookId ? books[addressBookId] : undefined)
)

export const selectContactEntries = createSelector(
  [
    selectAddressBooks,
    (_state: RootState, addressBookId?: string) => addressBookId
  ],
  (books, addressBookId): ContactEntry[] => {
    const bookIds = addressBookId ? [addressBookId] : Object.keys(books)
    return bookIds.flatMap(bookId =>
      (books[bookId]?.contacts ?? []).map(contact => ({
        addressBookId: bookId,
        contact
      }))
    )
  }
)
