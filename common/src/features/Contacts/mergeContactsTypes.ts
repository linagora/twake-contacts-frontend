import { Contact } from './contactsTypes'

export interface DuplicateContactEntry {
  addressBookId: string
  contact: Contact
}

export interface DuplicateContactGroup {
  id: string
  entries: DuplicateContactEntry[]
}
