import { AddressBookAccessLevel } from '@common/features/Contacts/davTypes'
import { userData } from '@common/features/User/userDataTypes'
import {
  getNonInvitableUserIds,
  getRoleTranslationKey,
  partitionMembers
} from './sharingHelpers'

describe('sharingHelpers', () => {
  const currentUser: userData = {
    openpaasId: 'user-1',
    name: 'Alice',
    email: 'alice@example.com',
    family_name: '',
    given_name: '',
    sid: '',
    sub: ''
  }

  describe('partitionMembers', () => {
    it('returns currentUser in me when current user is in invitedMembers', () => {
      const invited: userData[] = [
        {
          openpaasId: 'user-1',
          name: 'Alice Updated',
          email: 'alice@example.com',
          role: AddressBookAccessLevel.Owner,
          family_name: '',
          given_name: '',
          sid: '',
          sub: ''
        },
        {
          openpaasId: 'user-2',
          name: 'Bob',
          email: 'bob@example.com',
          role: AddressBookAccessLevel.Viewer,
          family_name: '',
          given_name: '',
          sid: '',
          sub: ''
        }
      ]

      const { me, others } = partitionMembers(invited, currentUser)

      expect(me).toEqual(invited[0])
      expect(others).toEqual([invited[1]])
    })

    it('falls back to currentUser when current user is not in invitedMembers', () => {
      const invited: userData[] = [
        {
          openpaasId: 'user-2',
          name: 'Bob',
          email: 'bob@example.com',
          role: AddressBookAccessLevel.Viewer,
          family_name: '',
          given_name: '',
          sid: '',
          sub: ''
        }
      ]

      const { me, others } = partitionMembers(invited, currentUser)

      expect(me).toEqual(currentUser)
      expect(others).toEqual([invited[0]])
    })

    it('filters out members with role AddressBookAccessLevel.None', () => {
      const invited: userData[] = [
        {
          openpaasId: 'user-2',
          name: 'Bob',
          email: 'bob@example.com',
          role: AddressBookAccessLevel.Viewer,
          family_name: '',
          given_name: '',
          sid: '',
          sub: ''
        },
        {
          openpaasId: 'user-3',
          name: 'Charlie',
          email: 'charlie@example.com',
          role: AddressBookAccessLevel.None,
          family_name: '',
          given_name: '',
          sid: '',
          sub: ''
        }
      ]

      const { others } = partitionMembers(invited, currentUser)

      expect(others).toHaveLength(1)
      expect(others[0].openpaasId).toBe('user-2')
    })
  })

  describe('getRoleTranslationKey', () => {
    it('returns correct translation keys for known roles', () => {
      expect(getRoleTranslationKey(AddressBookAccessLevel.Owner)).toBe(
        'contacts.share.owner'
      )
      expect(getRoleTranslationKey(AddressBookAccessLevel.Editor)).toBe(
        'contacts.share.editor'
      )
      expect(getRoleTranslationKey(AddressBookAccessLevel.Viewer)).toBe(
        'contacts.share.viewer'
      )
      expect(getRoleTranslationKey(AddressBookAccessLevel.ReadWrite)).toBe(
        'contacts.share.readWrite'
      )
    })

    it('returns empty string for None or undefined role', () => {
      expect(getRoleTranslationKey(AddressBookAccessLevel.None)).toBe('')
      expect(getRoleTranslationKey(undefined)).toBe('')
    })
  })

  describe('getNonInvitableUserIds', () => {
    const member = (
      openpaasId: string,
      role: AddressBookAccessLevel
    ): userData => ({ ...currentUser, openpaasId, role })

    it('contains the current user and the members with access', () => {
      const ids = getNonInvitableUserIds(
        [
          member('user-2', AddressBookAccessLevel.Viewer),
          member('user-3', AddressBookAccessLevel.Editor)
        ],
        'user-1'
      )

      expect([...ids].sort()).toEqual(['user-1', 'user-2', 'user-3'])
    })

    it('does not contain the members whose access was removed', () => {
      const ids = getNonInvitableUserIds(
        [member('user-2', AddressBookAccessLevel.None)],
        'user-1'
      )

      expect([...ids]).toEqual(['user-1'])
    })

    it('ignores missing ids', () => {
      const ids = getNonInvitableUserIds([{ ...currentUser, openpaasId: '' }])

      expect(ids.size).toBe(0)
    })
  })
})
