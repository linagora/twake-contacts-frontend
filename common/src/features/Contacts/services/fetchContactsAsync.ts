import { ReducerCreators } from '@reduxjs/toolkit'
import { RejectedError, toRejectedError } from '@common/utils/errorUtils'
import { DomainInfo } from '@common/features/User/userDataTypes'
import { fetchAddressBooks } from '../ContactsDao'
import {
  ContactsState,
  AddressBookWithContacts,
  Contact
} from '../contactsTypes'
import { CONTACTS_PAGINATION_LIMIT } from '../constants'
import { fetchPaginatedContacts } from './fetchPaginatedContacts'

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
        let remainingSlot = CONTACTS_PAGINATION_LIMIT

        for (const book of books) {
          // an unknown count (shared books) may hide contacts
          const mayHaveContacts = book.contactsCount !== 0
          let validContacts: Contact[] = []
          let hasMoreForBook = mayHaveContacts
          let newOffset = 0

          if (remainingSlot > 0 && mayHaveContacts) {
            const requestedLimit = remainingSlot
            const result = await fetchPaginatedContacts(
              book,
              userId,
              requestedLimit,
              0
            )
            validContacts = result.contacts
            hasMoreForBook = result.hasMore
            newOffset = result.offset
            remainingSlot -= validContacts.length
          }

          addressBooks[book.id] = {
            ...book,
            contacts: validContacts,
            offset: newOffset,
            hasMore: hasMoreForBook
          }
        }

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
