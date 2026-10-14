import { ReducerCreators } from '@reduxjs/toolkit'
import { RejectedError, toRejectedError } from '@common/utils/errorUtils'
import { moveContact } from '../ContactsDao'
import {
  AddressBookWithContacts,
  Contact,
  ContactsState
} from '../contactsTypes'
import { placeContactInListings } from '../contactListings'

export interface MoveContactArgs {
  userId: string
  fromAddressBookId: string
  toAddressBookId: string
  contact: Contact
}

function removeContactFromBook(
  book: AddressBookWithContacts,
  contactId: string
): AddressBookWithContacts {
  return {
    ...book,
    contacts: book.contacts.filter(contact => contact.id !== contactId),
    contactsCount:
      typeof book.contactsCount === 'number'
        ? book.contactsCount - 1
        : book.contactsCount
  }
}

function addOrReplaceContactInBook(
  book: AddressBookWithContacts,
  contact: Contact
): AddressBookWithContacts {
  const index = book.contacts.findIndex(c => c.id === contact.id)
  if (index !== -1) {
    const contacts = [...book.contacts]
    contacts[index] = contact
    return { ...book, contacts }
  }
  return {
    ...book,
    contacts: [...book.contacts, contact],
    contactsCount:
      typeof book.contactsCount === 'number'
        ? book.contactsCount + 1
        : book.contactsCount
  }
}

export const moveContactThunk = (create: ReducerCreators<ContactsState>) =>
  create.asyncThunk<
    MoveContactArgs,
    MoveContactArgs,
    { rejectValue: RejectedError }
  >(
    async (args, { rejectWithValue }) => {
      try {
        await moveContact(
          args.userId,
          args.fromAddressBookId,
          args.toAddressBookId,
          args.contact
        )
        return args
      } catch (err) {
        return rejectWithValue(toRejectedError(err))
      }
    },
    {
      fulfilled: (state, action) => {
        const { fromAddressBookId, toAddressBookId, contact } = action.payload
        const fromBook = state.addressBooks[fromAddressBookId]
        if (fromBook) {
          state.addressBooks[fromAddressBookId] = removeContactFromBook(
            fromBook,
            contact.id
          )
        }

        const toBook = state.addressBooks[toAddressBookId]
        if (toBook) {
          state.addressBooks[toAddressBookId] = addOrReplaceContactInBook(
            toBook,
            contact
          )
        }

        placeContactInListings(
          state,
          { addressBookId: toAddressBookId, contactId: contact.id },
          { addressBookId: fromAddressBookId, contactId: contact.id }
        )
      },
      rejected: (state, action) => {
        state.error = action.payload?.message ?? 'Failed to move contact'
      }
    }
  )
