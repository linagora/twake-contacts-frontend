import { ReducerCreators } from '@reduxjs/toolkit'
import { RejectedError, toRejectedError } from '@common/utils/errorUtils'
import { DomainInfo } from '@common/features/User/userDataTypes'
import { fetchAddressBooks } from '../ContactsDao'
import { AddressBook, ContactsState } from '../contactsTypes'
import { toContactsErrorKey } from '../contactsUtils'

export interface FetchContactsPayload {
  userId: string
  domains?: DomainInfo[]
}

export const fetchContactsThunk = (create: ReducerCreators<ContactsState>) =>
  create.asyncThunk<
    AddressBook[],
    FetchContactsPayload,
    { rejectValue: RejectedError }
  >(
    async ({ userId, domains }, { rejectWithValue }) => {
      try {
        return await fetchAddressBooks(userId, domains)
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
        // The listings restart from their first page with the new books
        state.addressBooks = {}
        state.listings = {}
        for (const book of action.payload) {
          state.addressBooks[book.id] = { ...book, contacts: [] }
          if (book.contactsCount === 0) {
            state.listings[book.id] = {
              refs: [],
              next: null,
              hasMore: false,
              loadingRequestId: null
            }
          }
        }
      },
      rejected: (state, action) => {
        state.loading = false
        if (action.payload?.status !== 401) {
          state.error = toContactsErrorKey(
            action.payload,
            'contacts.errors.load'
          )
        }
      }
    }
  )
