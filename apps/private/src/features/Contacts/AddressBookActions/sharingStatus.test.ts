import { classifyAddressBook } from '@common/features/Contacts/addressBookModel'
import {
  AddressBook,
  RawAddressBook
} from '@common/features/Contacts/contactsTypes'
import { AddressBookAccessLevel } from '@common/features/Contacts/davTypes'
import { userData } from '@common/features/User/userDataTypes'
import { getSharingStatus } from './sharingStatus'

// classified for the user the book is listed for
const ownBook = (overrides: Partial<RawAddressBook> = {}): AddressBook => {
  const book: RawAddressBook = {
    id: 'book1',
    userId: 'alice',
    name: 'Clients',
    contactsCount: null,
    acl: [],
    canWrite: true,
    ...overrides
  }
  return classifyAddressBook(book, book.userId)
}

const member = (
  openpaasId: string,
  role: AddressBookAccessLevel
): userData => ({
  openpaasId,
  role,
  email: `${openpaasId}@example.com`,
  given_name: openpaasId,
  family_name: '',
  name: openpaasId,
  sid: openpaasId,
  sub: openpaasId
})

describe('getSharingStatus', () => {
  it('tells nothing for a private book', () => {
    expect(getSharingStatus(ownBook())).toBeUndefined()
    expect(getSharingStatus(ownBook({ invitedMembers: [] }))).toBeUndefined()
  })

  it('counts the members of a book of the user', () => {
    expect(
      getSharingStatus(
        ownBook({
          invitedMembers: [
            member('bob', AddressBookAccessLevel.Viewer),
            member('carol', AddressBookAccessLevel.Editor)
          ]
        })
      )
    ).toEqual({ kind: 'owned', membersCount: 2, isPublic: false })
  })

  it('does not count the members whose access was revoked, nor the owner', () => {
    expect(
      getSharingStatus(
        ownBook({
          invitedMembers: [
            member('alice', AddressBookAccessLevel.Owner),
            member('bob', AddressBookAccessLevel.None)
          ]
        })
      )
    ).toBeUndefined()
  })

  it('tells a public book of the user', () => {
    expect(getSharingStatus(ownBook({ isPublic: true }))).toEqual({
      kind: 'owned',
      membersCount: 0,
      isPublic: true
    })
  })

  it('tells the owner and the role of the user on a book shared with them', () => {
    expect(
      getSharingStatus(
        ownBook({
          ownerId: 'bob',
          ownerDisplayName: 'Bob Martin',
          shareAccess: AddressBookAccessLevel.Viewer,
          canWrite: false
        })
      )
    ).toEqual({
      kind: 'sharedWithMe',
      owner: 'Bob Martin',
      roleKey: 'contacts.share.viewer'
    })
  })

  it('takes the role of a subscription from its rights', () => {
    expect(
      getSharingStatus(
        ownBook({ ownerId: 'bob', ownerDisplayName: 'Bob Martin' })
      )
    ).toMatchObject({ roleKey: 'contacts.share.readWrite' })
  })

  it('tells nothing on a shared book whose owner is unknown', () => {
    expect(getSharingStatus(ownBook({ ownerId: 'bob' }))).toBeUndefined()
  })

  it('tells nothing on the domain book', () => {
    expect(getSharingStatus(ownBook({ id: 'dab', isPublic: true }))).toBe(
      undefined
    )
  })
})
