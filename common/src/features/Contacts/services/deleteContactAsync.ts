import { ReducerCreators } from '@reduxjs/toolkit'
import { RejectedError, toRejectedError } from '@common/utils/errorUtils'
import { deleteContact } from '../ContactsDao'
import { ContactsState } from '../contactsTypes'
import { toContactsErrorKey } from '../contactsUtils'

export interface DeleteContactArgs {
  userId: string
  addressBookId: string
  contactId: string
}

export const deleteContactThunk = (create: ReducerCreators<ContactsState>) =>
  create.asyncThunk<
    DeleteContactArgs,
    DeleteContactArgs,
    { rejectValue: RejectedError }
  >(
    async (args, { rejectWithValue }) => {
      try {
        await deleteContact(args.userId, args.addressBookId, args.contactId)
        return args
      } catch (err) {
        return rejectWithValue(toRejectedError(err))
      }
    },
    {
      rejected: (state, action) => {
        state.error = toContactsErrorKey(
          action.payload,
          'contacts.errors.delete'
        )
      }
    }
  )
