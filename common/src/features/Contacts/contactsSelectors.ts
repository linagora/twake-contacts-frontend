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
