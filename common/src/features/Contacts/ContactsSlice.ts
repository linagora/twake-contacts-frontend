import { createAppSlice } from '@common/app/createAppSlice'
import { ContactsState } from './contactsTypes'
import { fetchContactsThunk } from './services'

const initialState: ContactsState = {
  addressBooks: [],
  contacts: [],
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
    fetchContacts: fetchContactsThunk(create)
  })
})

export const { clearContactsError, fetchContacts } = ContactsSlice.actions
export default ContactsSlice.reducer
