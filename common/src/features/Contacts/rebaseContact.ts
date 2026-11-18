import { Contact } from './contactsTypes'

/** A field of a contact an edit can change: neither its identity nor its version. */
export type ContactField = Exclude<keyof Contact, 'id' | 'etag'>

/** What a form changed, and the version it was opened on. */
export interface ContactEdits {
  opened: Contact
  fields: ContactField[]
}

// both sides are built by the same code: the order of their keys matches
const isSame = (left: unknown, right: unknown): boolean =>
  JSON.stringify(left) === JSON.stringify(right)

const contactFields = (...contacts: Contact[]): ContactField[] => [
  ...new Set(
    contacts
      .flatMap(contact => Object.keys(contact) as (keyof Contact)[])
      .filter((key): key is ContactField => key !== 'id' && key !== 'etag')
  )
]

/** The fields of `edited` that differ from the contact the form was filled with. */
export function editedFields(
  unedited: Contact,
  edited: Contact
): ContactField[] {
  return contactFields(unedited, edited).filter(
    field => !isSame(unedited[field], edited[field])
  )
}

const isChangedMeanwhile =
  (edited: Contact, edits: ContactEdits, current: Contact) =>
  (field: ContactField): boolean =>
    !isSame(current[field], edits.opened[field]) &&
    !isSame(current[field], edited[field])

/**
 * The edits re-applied over `current`, a version saved meanwhile by someone
 * else, with its ETag. Undefined when that version changed a field the form
 * edited too, as the save would lose that change, or when its ETag is unknown,
 * as the save would then be unguarded.
 */
export function rebaseContact(
  edited: Contact,
  edits: ContactEdits,
  current: Contact
): Contact | undefined {
  if (!current.etag) return undefined
  if (edits.fields.some(isChangedMeanwhile(edited, edits, current))) {
    return undefined
  }
  return {
    ...current,
    ...Object.fromEntries(edits.fields.map(field => [field, edited[field]])),
    etag: current.etag
  }
}
