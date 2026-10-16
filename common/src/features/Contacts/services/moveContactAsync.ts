import { ReducerCreators } from '@reduxjs/toolkit'
import { RejectedError, toRejectedError } from '@common/utils/errorUtils'
import { moveContact } from '../ContactsDao'
import {
  AddressBookWithContacts,
  Contact,
  ContactsState
} from '../contactsTypes'
import { placeContact } from '../contactsUtils'

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
  const previousLength = book.contacts.length
  const contacts = book.contacts.filter(contact => contact.id !== contactId)
  const wasRemoved = contacts.length < previousLength
  return {
    ...book,
    contacts,
    offset: wasRemoved ? Math.max(0, book.offset - 1) : book.offset,
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
  const contacts = placeContact(book.contacts, contact)
  if (book.contacts.some(c => c.id === contact.id)) {
    return { ...book, contacts }
  }
  return {
    ...book,
    contacts,
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
        const fromBook = state.addressBooks[action.payload.fromAddressBookId]
        if (fromBook) {
          state.addressBooks[action.payload.fromAddressBookId] =
            removeContactFromBook(fromBook, action.payload.contact.id)
        }

        const toBook = state.addressBooks[action.payload.toAddressBookId]
        if (toBook) {
          state.addressBooks[action.payload.toAddressBookId] =
            addOrReplaceContactInBook(toBook, action.payload.contact)
        }
      },
      rejected: (state, action) => {
        state.error = action.payload?.message ?? 'Failed to move contact'
      }
    }
  )
