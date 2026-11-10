import { AddressBook } from '@common/features/Contacts/contactsTypes'
import { AddressBookAccessLevel } from '@common/features/Contacts/davTypes'
import { getRoleTranslationKey } from '../ShareAddressBook/sharingHelpers'

export type SharingStatus =
  | { kind: 'owned'; membersCount: number; isPublic: boolean }
  | { kind: 'sharedWithMe'; owner: string; roleKey: string }

// a subscription to a public book carries no share access: its rights tell
// the role
const getAccessLevel = (book: AddressBook): AddressBookAccessLevel =>
  book.shareAccess ??
  (book.canWrite
    ? AddressBookAccessLevel.ReadWrite
    : AddressBookAccessLevel.Viewer)

const countMembers = (book: AddressBook): number =>
  (book.invitedMembers ?? []).filter(
    member =>
      member.role !== AddressBookAccessLevel.None &&
      member.openpaasId !== book.userId
  ).length

/**
 * Who can read the book: the members and the visibility of a book of the
 * user, or the owner and the role of the user on the book of a colleague.
 * Undefined when there is nothing to tell, as for a private book.
 */
export const getSharingStatus = (
  book: AddressBook
): SharingStatus | undefined => {
  if (book.id === 'dab') return undefined
  if (book.ownerId) {
    const roleKey = getRoleTranslationKey(getAccessLevel(book))
    return book.ownerDisplayName && roleKey
      ? { kind: 'sharedWithMe', owner: book.ownerDisplayName, roleKey }
      : undefined
  }
  const membersCount = countMembers(book)
  const isPublic = Boolean(book.isPublic)
  return membersCount > 0 || isPublic
    ? { kind: 'owned', membersCount, isPublic }
    : undefined
}
