import { ReducerCreators } from '@reduxjs/toolkit'
import { RejectedError, toRejectedError } from '@common/utils/errorUtils'
import { fetchAddressBooks, fetchContactsForBook } from '../ContactsDao'
import { Contact, ContactsState } from '../contactsTypes'

export const fetchContactsThunk = (create: ReducerCreators<ContactsState>) =>
  create.asyncThunk<Contact[], string, { rejectValue: RejectedError }>(
    async (userId, { rejectWithValue }) => {
      try {
        const books = await fetchAddressBooks(userId)
        const book = books.find(b => b.contactsCount > 0) ?? books[0]
        if (!book) return []
        return await fetchContactsForBook(userId, book.id)
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
        state.contacts = action.payload
      },
      rejected: (state, action) => {
        state.loading = false
        if (action.payload?.status !== 401) {
          state.error = action.payload?.message ?? 'Failed to load contacts'
        }
      }
    }
  )
