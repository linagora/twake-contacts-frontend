import { ReducerCreators } from '@reduxjs/toolkit'
import { deleteAddressBook } from '../ContactsDao'
import { RejectedError, toRejectedError } from '@common/utils/errorUtils'
import { ContactsState } from '../contactsTypes'
import { toContactsErrorKey } from '../contactsUtils'

export const deleteAddressBookThunk = (
  create: ReducerCreators<ContactsState>
): ReturnType<
  typeof create.asyncThunk<
    { addressBookId: string },
    { userId: string; addressBookId: string },
    { rejectValue: RejectedError }
  >
> =>
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
        const { addressBookId } = action.payload
        // a shared book (with an owner) is only removed from the list
        const isCopy = Boolean(state.addressBooks[addressBookId]?.ownerId)
        state.addressBookSuccess = {
          operation: isCopy ? 'remove' : 'delete',
          requestId: action.meta.requestId
        }
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete -- address books are a dictionary keyed by id
        delete state.addressBooks[addressBookId]
      },
      rejected: (state, action) => {
        const { addressBookId } = action.meta.arg
        const isCopy = Boolean(state.addressBooks[addressBookId]?.ownerId)
        state.error = toContactsErrorKey(
          action.payload,
          isCopy
            ? 'contacts.errors.removeAddressBook'
            : 'contacts.errors.deleteAddressBook'
        )
      }
    }
  )
