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
  // a member is the current user only when both share the same defined id
  const isMe = (member: userData): boolean =>
    !!currentUser.openpaasId && member.openpaasId === currentUser.openpaasId
  const meMatch = invitedMembers.find(isMe)
  const othersList = invitedMembers.filter(
    m => !isMe(m) && m.role !== AddressBookAccessLevel.None
  )

  // the profile of the current user is known already: only its role is taken,
  // so that it shows even when the lookup of its own entry failed
  return {
    me: meMatch
      ? { ...currentUser, role: meMatch.role, href: meMatch.href }
      : { ...currentUser },
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
