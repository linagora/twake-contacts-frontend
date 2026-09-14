import { ReducerCreators } from '@reduxjs/toolkit'
import { RejectedError, toRejectedError } from '@common/utils/errorUtils'
import { DomainInfo } from '@common/features/User/userDataTypes'
import { fetchAddressBooks, fetchContactsForBook } from '../ContactsDao'
import { ContactsState, AddressBookWithContacts } from '../contactsTypes'

export interface FetchContactsPayload {
  userId: string
  domains?: DomainInfo[]
}

export const fetchContactsThunk = (create: ReducerCreators<ContactsState>) =>
  create.asyncThunk<
    Record<string, AddressBookWithContacts>,
    FetchContactsPayload,
    { rejectValue: RejectedError }
  >(
    async ({ userId, domains }, { rejectWithValue }) => {
      try {
        const books = await fetchAddressBooks(userId, domains)
        const addressBooks: Record<string, AddressBookWithContacts> = {}

        await Promise.all(
          books.map(async book => {
            const contacts = await fetchContactsForBook(book, userId)

            addressBooks[book.id] = {
              ...book,
              contacts: contacts?.length > 0 ? contacts : []
            }
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
