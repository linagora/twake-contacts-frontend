import { ReducerCreators } from '@reduxjs/toolkit'
import { RejectedError, toRejectedError } from '@common/utils/errorUtils'
import { fetchAddressBooks, fetchContactsForBook } from '../ContactsDao'
import { ContactsState, AddressBookWithContacts } from '../contactsTypes'

export const fetchContactsThunk = (create: ReducerCreators<ContactsState>) =>
  create.asyncThunk<
    Record<string, AddressBookWithContacts>,
    string,
    { rejectValue: RejectedError }
  >(
    async (userId, { rejectWithValue }) => {
      try {
        const books = await fetchAddressBooks(userId)
        const addressBooks: Record<string, AddressBookWithContacts> = {}

        await Promise.all(
          books.map(async book => {
            const contacts =
              book.contactsCount > 0
                ? await fetchContactsForBook(userId, book.id)
                : []
            addressBooks[book.id] = { ...book, contacts }
          })
        )

        return addressBooks
      } catch (err) {
        return rejectWithValue(toRejectedError(err))
      }
    },
    {
      pending: state => {
        state.loading = true
        state.error = null
      },
      fulfilled: (state, action) => {
        state.loading = false
        state.addressBooks = action.payload
      },
      rejected: (state, action) => {
        state.loading = false
        if (action.payload?.status !== 401) {
          state.error = action.payload?.message ?? 'Failed to load contacts'
        }
      }
    }
  )
