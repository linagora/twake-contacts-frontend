import { Contact } from '@common/features/Contacts/contactsTypes'
import { useState } from 'react'

interface OpenedVersion {
  contactKey: string
  etag?: string
}

/**
 * The ETag of the contact as first shown under `contactKey`. A realtime refresh
 * replaces the contact of the store with the version saved meanwhile by
 * someone else: an edit form filled from the first one must still save against
 * it, to be refused rather than silently overwrite that change.
 *
 * The form saving its own version records the ETag of that save: when the
 * form stays open, as after a failed move, it saves again against it.
 */
export const useOpenedEtag = (
  contact: Contact | undefined,
  contactKey: string
): [string | undefined, (savedEtag: string | undefined) => void] => {
  const [opened, setOpened] = useState<OpenedVersion>()
  const isCurrent = opened?.contactKey === contactKey
  if (contact && !isCurrent) setOpened({ contactKey, etag: contact.etag })
  const recordSaved = (etag: string | undefined): void =>
    setOpened({ contactKey, etag })
  return [isCurrent ? opened.etag : contact?.etag, recordSaved]
}
