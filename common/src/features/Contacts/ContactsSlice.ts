import { createAppSlice } from '@common/app/createAppSlice'
import { DEFAULT_ADDRESS_BOOK_ID } from './constants'
import { Contact, ContactsState } from './contactsTypes'
import {
  createContactThunk,
  deleteContactThunk,
  fetchContactThunk,
  fetchContactsThunk,
  fetchMoreContactsThunk,
  moveContactThunk,
  updateContactThunk,
  createAddressBookThunk,
  fetchAddressBookDetailThunk,
  updateAddressBookSharesThunk
} from './services'
import { fetchUpdatedContactsThunk } from './services/fetchUpdatedContactsAsync'

const initialState: ContactsState = {
  addressBooks: {},
  listings: {},
  // address books are not loaded yet: pages show skeletons, not empty
  // states, and wait for them to place the contacts they read
  loading: true,
  error: null
}

const ContactsSlice = createAppSlice({
  name: DEFAULT_ADDRESS_BOOK_ID,
  initialState,
  reducers: create => ({
    clearContactsError: create.reducer(state => {
      state.error = null
    }),
    // stores the contact for its page without listing it: if it is in a
    // loaded range it is listed already, otherwise the next pages bring it
    addContactFromSearch: create.reducer(
      (
        state,
        action: { payload: { addressBookId: string; contact: Contact } }
      ) => {
        const { addressBookId, contact } = action.payload
        const book = state.addressBooks[addressBookId]
        if (!book) return
        const exists = book.contacts.some(c => c.id === contact.id)
        if (!exists) {
          book.contacts.push(contact)
        }
      }
    ),
    fetchContact: fetchContactThunk(create),
    fetchContacts: fetchContactsThunk(create),
    fetchMoreContacts: fetchMoreContactsThunk(create),
    fetchUpdatedContacts: fetchUpdatedContactsThunk(create),
    createContact: createContactThunk(create),
    updateContact: updateContactThunk(create),
    moveContact: moveContactThunk(create),
    deleteContact: deleteContactThunk(create),
    createAddressBook: createAddressBookThunk(create),
    fetchAddressBookDetail: fetchAddressBookDetailThunk(create),
    updateAddressBookShares: updateAddressBookSharesThunk(create)
  })
})

export const {
  addContactFromSearch,
  clearContactsError,
  createContact,
  deleteContact,
  fetchContact,
  fetchContacts,
  fetchMoreContacts,
  fetchUpdatedContacts,
  moveContact,
  updateContact,
  createAddressBook,
  fetchAddressBookDetail,
  updateAddressBookShares
} = ContactsSlice.actions
export default ContactsSlice.reducer
