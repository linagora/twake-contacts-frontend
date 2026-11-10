import { ReducerCreators } from '@reduxjs/toolkit'
import { RejectedError, toRejectedError } from '@common/utils/errorUtils'
import { setAddressBookPublished } from '../ContactsDao'
import { ContactsState } from '../contactsTypes'
import { toContactsErrorKey } from '../contactsUtils'

export interface PublishAddressBookPayload {
  userId: string
  addressBookId: string
  publish: boolean
}

export const publishAddressBookThunk = (
  create: ReducerCreators<ContactsState>
): ReturnType<
  typeof create.asyncThunk<
    void,
    PublishAddressBookPayload,
    { rejectValue: RejectedError }
  >
> =>
  create.asyncThunk<
    void,
    PublishAddressBookPayload,
    { rejectValue: RejectedError }
  >(
    async ({ userId, addressBookId, publish }, { rejectWithValue }) => {
      try {
        await setAddressBookPublished(userId, addressBookId, publish)
      } catch (err) {
        return rejectWithValue(toRejectedError(err))
      }
    },
    {
      pending: state => {
        state.error = null
      },
      fulfilled: (state, action) => {
        const { addressBookId, publish } = action.meta.arg
        if (state.addressBooks[addressBookId]) {
          state.addressBooks[addressBookId].isPublic = publish
        }
      },
      rejected: (state, action) => {
        if (action.payload?.status !== 401) {
          state.error = toContactsErrorKey(
            action.payload,
            'contacts.errors.share'
          )
        }
      }
    }
  )
