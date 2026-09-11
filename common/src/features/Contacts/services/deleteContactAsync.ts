import { ReducerCreators } from '@reduxjs/toolkit'
import { RejectedError, toRejectedError } from '@common/utils/errorUtils'
import { deleteContact } from '../ContactsDao'
import { ContactsState } from '../contactsTypes'

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
      fulfilled: (state, action) => {
        const book = state.addressBooks[action.payload.addressBookId]
        if (!book) return
        book.contacts = book.contacts.filter(
          contact => contact.id !== action.payload.contactId
        )
        book.contactsCount -= 1
      },
      rejected: (state, action) => {
        state.error = action.payload?.message ?? 'Failed to delete contact'
      }
    }
  )
