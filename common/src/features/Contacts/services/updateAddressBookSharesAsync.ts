import { ReducerCreators } from '@reduxjs/toolkit'
import { RejectedError, toRejectedError } from '@common/utils/errorUtils'
import { updateAddressBookShares, ShareeUpdate } from '../ContactsDao'
import { ContactsState } from '../contactsTypes'
import { toContactsErrorKey } from '../contactsUtils'

export interface UpdateAddressBookSharesPayload {
  userId: string
  addressBookId: string
  sharees: ShareeUpdate[]
}

export const updateAddressBookSharesThunk = (
  create: ReducerCreators<ContactsState>
) =>
  create.asyncThunk<
    void,
    UpdateAddressBookSharesPayload,
    { rejectValue: RejectedError }
  >(
    async ({ userId, addressBookId, sharees }, { rejectWithValue }) => {
      try {
        await updateAddressBookShares(userId, addressBookId, sharees)
      } catch (err) {
        return rejectWithValue(toRejectedError(err))
      }
    },
    {
      pending: state => {
        state.error = null
      },
      fulfilled: () => {},
      rejected: (state, action) => {
        if (action.payload?.status !== 401) {
          state.error = toContactsErrorKey(
            action.payload,
            'contacts.errors.share' // Assuming a similar translation key could exist
          )
        }
      }
    }
  )
