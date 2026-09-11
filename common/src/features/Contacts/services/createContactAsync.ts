import { ReducerCreators } from '@reduxjs/toolkit'
import { RejectedError, toRejectedError } from '@common/utils/errorUtils'
import { createContact } from '../ContactsDao'
import { Contact, ContactsState } from '../contactsTypes'

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
        await createContact(args.userId, args.addressBookId, args.contact)
        return args
      } catch (err) {
        return rejectWithValue(toRejectedError(err))
      }
    },
    {
      fulfilled: (state, action) => {
        const book = state.addressBooks[action.payload.addressBookId]
        if (!book) return
        book.contacts.push(action.payload.contact)
        book.contactsCount += 1
      },
      rejected: (state, action) => {
        state.error = action.payload?.message ?? 'Failed to create contact'
      }
    }
  )
