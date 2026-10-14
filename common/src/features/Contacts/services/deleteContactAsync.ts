import { ReducerCreators } from '@reduxjs/toolkit'
import { RejectedError, toRejectedError } from '@common/utils/errorUtils'
import { deleteContact } from '../ContactsDao'
import { ContactsState } from '../contactsTypes'
import { placeContactInListings } from '../contactListings'
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
      fulfilled: (state, action) => {
        const { addressBookId, contactId } = action.payload
        const book = state.addressBooks[addressBookId]
        if (!book) return
        book.contacts = book.contacts.filter(
          contact => contact.id !== contactId
        )
        if (book.contactsCount !== null) book.contactsCount -= 1
        placeContactInListings(state, { addressBookId, contactId })
      },
      rejected: (state, action) => {
        state.error = toContactsErrorKey(
          action.payload,
          'contacts.errors.delete'
        )
      }
    }
  )
