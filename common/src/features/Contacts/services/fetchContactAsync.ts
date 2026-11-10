import { ReducerCreators } from '@reduxjs/toolkit'
import { RejectedError, toRejectedError } from '@common/utils/errorUtils'
import { fetchContact } from '../ContactsDao'
import { Contact, ContactsState } from '../contactsTypes'

export interface FetchContactArgs {
  addressBookId: string
  contactId: string
}

const isContactMissing = (
  state: ContactsState,
  { addressBookId, contactId }: FetchContactArgs
): boolean => {
  const book = state.addressBooks[addressBookId]
  return !!book && !book.contacts.some(contact => contact.id === contactId)
}

// Only the first pages of a book are in the store, so a contact opened from
// a link or after a reload may have to be fetched on its own
export const fetchContactThunk = (
  create: ReducerCreators<ContactsState>
): ReturnType<
  typeof create.asyncThunk<
    { addressBookId: string; contact: Contact },
    FetchContactArgs,
    { rejectValue: RejectedError }
  >
> =>
  create.asyncThunk<
    { addressBookId: string; contact: Contact },
    FetchContactArgs,
    { rejectValue: RejectedError }
  >(
    async (args, { getState, rejectWithValue }) => {
      try {
        const state = getState() as { contacts: ContactsState }
        const book = state.contacts.addressBooks[args.addressBookId]
        const contact = await fetchContact(book, args.contactId)
        return { addressBookId: args.addressBookId, contact }
      } catch (err) {
        return rejectWithValue(toRejectedError(err))
      }
    },
    {
      options: {
        condition: (args, { getState }) => {
          const state = getState() as { contacts: ContactsState }
          return isContactMissing(state.contacts, args)
        }
      },
      fulfilled: (state, action) => {
        const { addressBookId, contact } = action.payload
        if (!isContactMissing(state, { addressBookId, contactId: contact.id }))
          return
        state.addressBooks[addressBookId].contacts.push(contact)
      }
      // a contact that cannot be fetched is shown as not found
    }
  )
