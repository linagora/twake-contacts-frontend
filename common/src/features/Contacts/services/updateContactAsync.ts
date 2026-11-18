import { ReducerCreators } from '@reduxjs/toolkit'
import { RejectedError, toRejectedError } from '@common/utils/errorUtils'
import { fetchSavedContact, saveContact } from '../ContactsDao'
import { Contact, ContactsState } from '../contactsTypes'
import { placeContactInListings } from '../contactListings'
import { toContactsErrorKey } from '../contactsUtils'
import { ContactEdits, rebaseContact } from '../rebaseContact'
import { CreateContactArgs } from './createContactAsync'

export interface UpdateContactArgs extends CreateContactArgs {
  /**
   * What the form changed: when the card changed meanwhile, these edits are
   * saved again, once, over that version, unless it changed the same fields.
   */
  edits?: ContactEdits
}

const isPreconditionFailed = (err: unknown): boolean =>
  toRejectedError(err).status === 412

async function rebaseOnSaved(
  { userId, addressBookId, contact, edits }: UpdateContactArgs,
  refusal: unknown
): Promise<Contact> {
  if (!edits || !isPreconditionFailed(refusal)) throw refusal
  // unreadable, the version saved meanwhile is still the reason of the refusal
  const current = await fetchSavedContact(
    userId,
    addressBookId,
    contact.id
  ).catch(() => undefined)
  const rebased = current && rebaseContact(contact, edits, current)
  if (!rebased) throw refusal
  return saveContact(userId, addressBookId, rebased, 'update')
}

async function saveUpdate(args: UpdateContactArgs): Promise<Contact> {
  try {
    return await saveContact(
      args.userId,
      args.addressBookId,
      args.contact,
      'update'
    )
  } catch (err) {
    return rebaseOnSaved(args, err)
  }
}

export const updateContactThunk = (
  create: ReducerCreators<ContactsState>
): ReturnType<
  typeof create.asyncThunk<
    CreateContactArgs,
    UpdateContactArgs,
    { rejectValue: RejectedError }
  >
> =>
  create.asyncThunk<
    CreateContactArgs,
    UpdateContactArgs,
    { rejectValue: RejectedError }
  >(
    async (args, { rejectWithValue }) => {
      try {
        const contact = await saveUpdate(args)
        return {
          userId: args.userId,
          addressBookId: args.addressBookId,
          contact
        }
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
        // the card changed since it was read: saving would lose that change
        state.error =
          action.payload?.status === 412
            ? 'contacts.errors.changedMeanwhile'
            : toContactsErrorKey(action.payload, 'contacts.errors.update')
      }
    }
  )
