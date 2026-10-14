import { AddressBook, ContactsState } from '../contactsTypes'
import { createAddressBook } from '../ContactsDao'
import { ReducerCreators } from '@reduxjs/toolkit'
import { RejectedError, toRejectedError } from '@common/utils/errorUtils'
import { toContactsErrorKey } from '../contactsUtils'

export interface CreateAddressBookArgs {
  userId: string
  name: string
}

export const createAddressBookThunk = (
  create: ReducerCreators<ContactsState>
) =>
  create.asyncThunk<
    AddressBook,
    CreateAddressBookArgs,
    { rejectValue: RejectedError }
  >(
    async (args, { rejectWithValue }) => {
      try {
        return await createAddressBook(args.userId, args.name)
      } catch (err: unknown) {
        return rejectWithValue(toRejectedError(err))
      }
    },
    {
      fulfilled: (state, action) => {
        const book = action.payload
        state.addressBooks[book.id] = { ...book, contacts: [] }
        state.listings[book.id] = {
          refs: [],
          next: null,
          hasMore: false,
          loadingRequestId: null
        }
      },
      rejected: (state, action) => {
        state.error = toContactsErrorKey(
          action.payload,
          'contacts.errors.create'
        )
      }
    }
  )
