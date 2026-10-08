import { ReducerCreators } from '@reduxjs/toolkit'
import { RejectedError, toRejectedError } from '@common/utils/errorUtils'
import { saveContact } from '../ContactsDao'
import { Contact, ContactsState } from '../contactsTypes'
import { toContactsErrorKey } from '../contactsUtils'

export interface CreateContactArgs {
  userId: string
  addressBookId: string
  contact: Contact
}

export const createContactThunk = (create: ReducerCreators<ContactsState>) =>
  create.asyncThunk<
    CreateContactArgs,
    CreateContactArgs,
    { rejectValue: RejectedError }
  >(
    async (args, { rejectWithValue }) => {
      try {
        await saveContact(args.userId, args.addressBookId, args.contact)
        return args
      } catch (err) {
        return rejectWithValue(toRejectedError(err))
      }
    },
    {
      rejected: (state, action) => {
        state.error = toContactsErrorKey(
          action.payload,
          'contacts.errors.create'
        )
      }
    }
  )
