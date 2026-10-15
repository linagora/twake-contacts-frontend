import { AddressBookAccessLevel } from '@common/features/Contacts/davTypes'
import { userData } from '@common/features/User/userDataTypes'
import { getRoleTranslationKey, partitionMembers } from './sharingHelpers'

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
    })

    it('returns empty string for None or undefined role', () => {
      expect(getRoleTranslationKey(AddressBookAccessLevel.None)).toBe('')
      expect(getRoleTranslationKey(undefined)).toBe('')
    })
  })
})
