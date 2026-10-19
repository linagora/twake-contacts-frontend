import { userData } from '@common/features/User/userDataTypes'
import { AddressBookAccessLevel } from '@common/features/Contacts/davTypes'

export interface PartitionedMembers {
  me: userData
  others: userData[]
}

/**
 * Partitions invited members into the current user ('me') and other active members ('others').
 * Excludes members with access level 'None'.
 */
export const partitionMembers = (
  invitedMembers: userData[],
  currentUser: userData
): PartitionedMembers => {
  const meMatch = invitedMembers.find(
    m => m.openpaasId === currentUser.openpaasId
  )
  const othersList = invitedMembers.filter(
    m =>
      m.openpaasId !== currentUser.openpaasId &&
      m.role !== AddressBookAccessLevel.None
  )

  return {
    me: meMatch || { ...currentUser },
    others: othersList
  }
}

/**
 * Returns the ids of the users that must not be suggested for an invitation:
 * the current user (owner) and the members who already have access.
 */
export const getNonInvitableUserIds = (
  invitedMembers: userData[],
  currentUserId?: string
): Set<string> =>
  new Set(
    [
      currentUserId,
      ...invitedMembers
        .filter(m => m.role !== AddressBookAccessLevel.None)
        .map(m => m.openpaasId)
    ].filter((id): id is string => Boolean(id))
  )

/**
 * Returns the translation key for an address book access level / role.
 */
export const getRoleTranslationKey = (
  role?: AddressBookAccessLevel
): string => {
  if (role === AddressBookAccessLevel.Owner) return 'contacts.share.owner'
  if (role === AddressBookAccessLevel.Editor) return 'contacts.share.editor'
  if (role === AddressBookAccessLevel.ReadWrite)
    return 'contacts.share.readWrite'
  if (role === AddressBookAccessLevel.Viewer) return 'contacts.share.viewer'
  return ''
}
