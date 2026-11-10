import { ReducerCreators } from '@reduxjs/toolkit'
import { RejectedError, toRejectedError } from '@common/utils/errorUtils'
import { copyContact } from '../ContactsDao'
import { Contact, ContactsState } from '../contactsTypes'
import { isContactTransferDestination } from '../contactsUtils'
import { placeContactInListings } from '../contactListings'

export interface CopyContactArgs {
  fromAddressBookId: string
  toAddressBookId: string
  contact: Contact
}

export const copyContactThunk = (
  create: ReducerCreators<ContactsState>
): ReturnType<
  typeof create.asyncThunk<
    CopyContactArgs,
    CopyContactArgs,
    { rejectValue: RejectedError }
  >
> =>
  create.asyncThunk<
    CopyContactArgs,
    CopyContactArgs,
    { rejectValue: RejectedError }
  >(
    async (args, { getState, rejectWithValue }) => {
      try {
        const { contacts } = getState() as { contacts: ContactsState }
        const source = contacts.addressBooks[args.fromAddressBookId]
        const destination = contacts.addressBooks[args.toAddressBookId]
        if (
          !source?.canWrite ||
          !destination ||
          !isContactTransferDestination(destination, source.id)
        ) {
          throw new Error('Invalid copy destination')
        }
        const destinationContactId = await copyContact(
          { userId: source.userId, addressBookId: source.id },
          { userId: destination.userId, addressBookId: destination.id },
          args.contact.id
        )
        return {
          ...args,
          contact: { ...args.contact, id: destinationContactId }
        }
      } catch (error) {
        return rejectWithValue(toRejectedError(error))
      }
    },
    {
      fulfilled: (state, { payload: { toAddressBookId, contact }, meta }) => {
        state.transferSuccess = { operation: 'copy', requestId: meta.requestId }
        const book = state.addressBooks[toAddressBookId]
        if (!book) return
        const index = book.contacts.findIndex(c => c.id === contact.id)
        if (index === -1) {
          book.contacts.push(contact)
          if (book.contactsCount !== null) book.contactsCount += 1
        } else {
          book.contacts[index] = contact
        }
        placeContactInListings(state, {
          addressBookId: toAddressBookId,
          contactId: contact.id
        })
      }
    }
  )
