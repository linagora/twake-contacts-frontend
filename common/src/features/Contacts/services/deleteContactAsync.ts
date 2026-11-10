import { ReducerCreators } from '@reduxjs/toolkit'
import { toOperationError } from '@common/utils/errorUtils'
import { deleteContact } from '../ContactsDao'
import { ContactsState } from '../contactsTypes'
import { placeContactInListings } from '../contactListings'
import {
  ContactsOperationError,
  messageKeyFor,
  operationMessageKey
} from '../operationMessages'

export interface DeleteContactArgs {
  userId: string
  addressBookId: string
  contactId: string
}

export const deleteContactThunk = (create: ReducerCreators<ContactsState>) =>
  create.asyncThunk<
    DeleteContactArgs,
    DeleteContactArgs,
    { rejectValue: ContactsOperationError }
  >(
    async (args, { rejectWithValue }) => {
      try {
        await deleteContact(args.userId, args.addressBookId, args.contactId)
        return args
      } catch (err) {
        return rejectWithValue(toOperationError(err, 'delete'))
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
        state.error = action.payload
          ? messageKeyFor(action.payload)
          : operationMessageKey('delete')
      }
    }
  )
