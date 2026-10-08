import { ReducerCreators } from '@reduxjs/toolkit'
import { RejectedError, toRejectedError } from '@common/utils/errorUtils'
import { moveContact } from '../ContactsDao'
import { Contact, ContactsState } from '../contactsTypes'

export interface MoveContactArgs {
  userId: string
  fromAddressBookId: string
  toAddressBookId: string
  contact: Contact
}

export const moveContactThunk = (create: ReducerCreators<ContactsState>) =>
  create.asyncThunk<
    MoveContactArgs,
    MoveContactArgs,
    { rejectValue: RejectedError }
  >(
    async (args, { rejectWithValue }) => {
      try {
        await moveContact(
          args.userId,
          args.fromAddressBookId,
          args.toAddressBookId,
          args.contact
        )
        return args
      } catch (err) {
        return rejectWithValue(toRejectedError(err))
      }
    },
    {
      rejected: (state, action) => {
        state.error = action.payload?.message ?? 'Failed to move contact'
      }
    }
  )
