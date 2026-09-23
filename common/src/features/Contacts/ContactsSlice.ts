import { createAppSlice } from '@common/app/createAppSlice'
import { DEFAULT_ADDRESS_BOOK_ID } from './constants'
import { ContactsState } from './contactsTypes'
import {
  createContactThunk,
  deleteContactThunk,
  fetchContactsThunk,
  fetchMoreContactsThunk,
  updateContactThunk
} from './services'

const initialState: ContactsState = {
  addressBooks: {},
  loading: false,
  error: null
}

const ContactsSlice = createAppSlice({
  name: DEFAULT_ADDRESS_BOOK_ID,
  initialState,
  reducers: create => ({
    clearContactsError: create.reducer(state => {
      state.error = null
    }),
    fetchContacts: fetchContactsThunk(create),
    fetchMoreContacts: fetchMoreContactsThunk(create),
    createContact: createContactThunk(create),
    updateContact: updateContactThunk(create),
    deleteContact: deleteContactThunk(create)
  })
})

export const {
  clearContactsError,
  createContact,
  deleteContact,
  fetchContacts,
  fetchMoreContacts,
  updateContact
} = ContactsSlice.actions
export default ContactsSlice.reducer
