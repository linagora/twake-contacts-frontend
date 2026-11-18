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
 */
export const useOpenedEtag = (
  contact: Contact | undefined,
  contactKey: string
): string | undefined => {
  const [opened, setOpened] = useState<OpenedVersion>()
  const isCurrent = opened?.contactKey === contactKey
  if (contact && !isCurrent) setOpened({ contactKey, etag: contact.etag })
  return isCurrent ? opened.etag : contact?.etag
}
