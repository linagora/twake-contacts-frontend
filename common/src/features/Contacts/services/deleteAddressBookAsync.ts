import { ReducerCreators } from '@reduxjs/toolkit'
import { deleteAddressBook } from '../ContactsDao'
import { RejectedError, toRejectedError } from '@common/utils/errorUtils'
import { ContactsState } from '../contactsTypes'
import { toContactsErrorKey } from '../contactsUtils'

export const deleteAddressBookThunk = (
  create: ReducerCreators<ContactsState>
) =>
  create.asyncThunk<
    { addressBookId: string },
    { userId: string; addressBookId: string },
    { rejectValue: RejectedError }
  >(
    async ({ userId, addressBookId }, { rejectWithValue }) => {
      try {
        await deleteAddressBook(userId, addressBookId)
        return { addressBookId }
      } catch (err) {
        return rejectWithValue(toRejectedError(err))
      }
    },
    {
      fulfilled: (state, action) => {
        delete state.addressBooks[action.payload.addressBookId]
      },
      rejected: (state, action) => {
        state.error = toContactsErrorKey(
          action.payload,
          'contacts.errors.delete'
        )
      }
    }
  )
