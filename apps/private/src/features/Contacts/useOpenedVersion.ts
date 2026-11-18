import { Contact } from '@common/features/Contacts/contactsTypes'
import { useState } from 'react'

interface OpenedVersion {
  contactKey: string
  contact: Contact
}

/**
 * The contact as first shown under `contactKey`. A realtime refresh replaces
 * the contact of the store with the version saved meanwhile by someone else:
 * an edit form filled from the first one must still save against it, to be
 * refused rather than silently overwrite that change.
 *
 * The form saving its own version records it: when the form stays open, as
 * after a failed move, it saves again against it.
 */
export const useOpenedVersion = (
  contact: Contact | undefined,
  contactKey: string
): [Contact | undefined, (saved: Contact) => void] => {
  const [opened, setOpened] = useState<OpenedVersion>()
  const isCurrent = opened?.contactKey === contactKey
  if (contact && !isCurrent) setOpened({ contactKey, contact })
  const recordSaved = (saved: Contact): void =>
    setOpened({ contactKey, contact: saved })
  return [isCurrent ? opened.contact : contact, recordSaved]
}
