import { createAppSlice } from '@common/app/createAppSlice'
import { ContactsState } from './contactsTypes'
import { createContactThunk, fetchContactsThunk } from './services'

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
    createContact: createContactThunk(create)
  })
})

export const { clearContactsError, createContact, fetchContacts } =
  ContactsSlice.actions
export default ContactsSlice.reducer
