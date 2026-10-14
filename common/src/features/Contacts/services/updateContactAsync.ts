import { ReducerCreators } from '@reduxjs/toolkit'
import { RejectedError, toRejectedError } from '@common/utils/errorUtils'
import { saveContact } from '../ContactsDao'
import { ContactsState } from '../contactsTypes'
import { placeContactInListings } from '../contactListings'
import { toContactsErrorKey } from '../contactsUtils'
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
        const { addressBookId, contact } = action.payload
        const book = state.addressBooks[addressBookId]
        if (!book) return
        book.contacts = book.contacts.map(c =>
          c.id === contact.id ? contact : c
        )
        // a new name can move the contact
        placeContactInListings(state, { addressBookId, contactId: contact.id })
      },
      rejected: (state, action) => {
        state.error = toContactsErrorKey(
          action.payload,
          'contacts.errors.update'
        )
      }
    }
  )
