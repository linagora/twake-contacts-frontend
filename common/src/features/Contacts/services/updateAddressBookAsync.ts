import { ReducerCreators } from '@reduxjs/toolkit'
import { ContactsState } from '../contactsTypes'
import { RejectedError, toRejectedError } from '@common/utils/errorUtils'
import { updateAddressBook } from '../ContactsDao'
import { toContactsErrorKey } from '../contactsUtils'

export interface UpdateAddressBookPayload {
  userId: string
  addressBookId: string
  name: string
}

export const updateAddressBookThunk = (
  create: ReducerCreators<ContactsState>
) =>
  create.asyncThunk<
    UpdateAddressBookPayload,
    Omit<UpdateAddressBookPayload, 'userId'>,
    { rejectValue: RejectedError }
  >(
    async ({ userId, addressBookId, name }, { rejectWithValue }) => {
      try {
        await updateAddressBook(userId, addressBookId, { name })
        return { addressBookId, name }
      } catch (err) {
        return rejectWithValue(toRejectedError(err))
      }
    },
    {
      fulfilled: (state, action) => {
        const { addressBookId, name } = action.payload
        state.addressBookSuccess = {
          operation: 'update',
          requestId: action.meta.requestId
        }
        // same lookup as in deleteAddressBook's fulfilled
        const book = state.addressBooks[addressBookId]
        if (book) {
          book.name = name
        }
      },
      rejected: (state, action) => {
        state.error = toContactsErrorKey(
          action.payload,
          'contacts.errors.update'
        )
      }
    }
  )
