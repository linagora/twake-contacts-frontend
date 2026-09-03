export interface AddressBook {
  id: string
  name: string
  contactsCount: number
}

export interface Contact {
  id: string
  displayName: string
  email: string | null
}

export interface ContactsState {
  addressBooks: AddressBook[]
  contacts: Contact[]
  loading: boolean
  error: string | null
}
