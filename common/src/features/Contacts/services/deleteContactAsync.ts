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
        const contacts = book.contacts.filter(
          contact => contact.id !== action.payload.contactId
        )
        // The next page is fetched by offset and the server list just lost
        // one loaded contact, so keeping the offset would skip a contact
        if (contacts.length < book.contacts.length) {
          book.offset = Math.max(0, book.offset - 1)
        }
        book.contacts = contacts
        book.contactsCount -= 1
      },
      rejected: (state, action) => {
        state.error = action.payload?.message ?? 'Failed to delete contact'
      }
    }
  )
