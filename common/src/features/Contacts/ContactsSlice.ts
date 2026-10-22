import { copyContactThunk } from './services/copyContactAsync'
import { createAppSlice } from '@common/app/createAppSlice'
import { DEFAULT_ADDRESS_BOOK_ID, DEFAULT_CONTACT_SORT } from './constants'
import { Contact, ContactSort, ContactsState } from './contactsTypes'
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
  updateAddressBookSharesThunk,
  publishAddressBookThunk
} from './services'
import { fetchUpdatedContactsThunk } from './services/fetchUpdatedContactsAsync'
import { subscribeAddressBookThunk } from './services/subscribeAddressBookAsync'
import { deleteAddressBookThunk } from './services/deleteAddressBookAsync'
import { updateAddressBookThunk } from './services/updateAddressBookAsync'

const initialState: ContactsState = {
  addressBooks: {},
  listings: {},
  sort: DEFAULT_CONTACT_SORT,
  // address books are not loaded yet: pages show skeletons, not empty
  // states, and wait for them to place the contacts they read
  loading: true,
  error: null
}

const ContactsSlice = createAppSlice({
  name: DEFAULT_ADDRESS_BOOK_ID,
  initialState,
  reducers: create => ({
    clearTransferSuccess: create.reducer(state => {
      state.transferSuccess = null
    }),
    clearAddressBookSuccess: create.reducer(state => {
      state.addressBookSuccess = null
    }),
    clearContactsError: create.reducer(state => {
      state.error = null
    }),
    // the loaded pages are in the previous order: the listings restart
    setContactSort: create.reducer(
      (state, action: { payload: ContactSort }) => {
        state.sort = action.payload
        state.listings = {}
      }
    ),
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
    copyContact: copyContactThunk(create),
    deleteContact: deleteContactThunk(create),
    createAddressBook: createAddressBookThunk(create),
    fetchAddressBookDetail: fetchAddressBookDetailThunk(create),
    updateAddressBookShares: updateAddressBookSharesThunk(create),
    subscribeAddressBook: subscribeAddressBookThunk(create),
    deleteAddressBook: deleteAddressBookThunk(create),
    updateAddressBook: updateAddressBookThunk(create),
    publishAddressBook: publishAddressBookThunk(create)
  })
})

export const {
  addContactFromSearch,
  clearAddressBookSuccess,
  clearContactsError,
  clearTransferSuccess,
  createContact,
  deleteContact,
  fetchContact,
  fetchContacts,
  fetchMoreContacts,
  fetchUpdatedContacts,
  moveContact,
  setContactSort,
  copyContact,
  updateContact,
  createAddressBook,
  fetchAddressBookDetail,
  updateAddressBookShares,
  updateAddressBook,
  subscribeAddressBook,
  deleteAddressBook,
  publishAddressBook
} = ContactsSlice.actions
export default ContactsSlice.reducer
