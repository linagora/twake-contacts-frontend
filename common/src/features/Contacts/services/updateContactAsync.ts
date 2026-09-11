import { ReducerCreators } from '@reduxjs/toolkit'
import { RejectedError, toRejectedError } from '@common/utils/errorUtils'
import { saveContact } from '../ContactsDao'
import { ContactsState } from '../contactsTypes'
import { CreateContactArgs } from './createContactAsync'

export const updateContactThunk = (create: ReducerCreators<ContactsState>) =>
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
      fulfilled: (state, action) => {
        const book = state.addressBooks[action.payload.addressBookId]
        if (!book) return
        book.contacts = book.contacts.map(contact =>
          contact.id === action.payload.contact.id
            ? action.payload.contact
            : contact
        )
      },
      rejected: (state, action) => {
        state.error = action.payload?.message ?? 'Failed to update contact'
      }
    }
  )
