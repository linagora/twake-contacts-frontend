import { createAppSlice } from '@common/app/createAppSlice'
import { ContactsState } from './contactsTypes'
import {
  createContactThunk,
  deleteContactThunk,
  fetchContactsThunk,
  updateContactThunk
} from './services'

const initialState: ContactsState = {
  addressBooks: {},
  loading: false,
  error: null
}

const ContactsSlice = createAppSlice({
  name: 'contacts',
  initialState,
  reducers: create => ({
    clearContactsError: create.reducer(state => {
      state.error = null
    }),
    fetchContacts: fetchContactsThunk(create),
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
  updateContact
} = ContactsSlice.actions
export default ContactsSlice.reducer
