import { userData } from '../User/userDataTypes'

/** Who, besides its owner, can read an address book. */
export interface BookAudience {
  /** Published: every authenticated user can read it. */
  isPublic: boolean
  /** Keys of the users the book is shared with. */
  members: string[]
}

export const PRIVATE_AUDIENCE: BookAudience = { isPublic: false, members: [] }

const memberKey = (member: userData): string =>
  member.openpaasId || member.href || member.email

export const toBookAudience = (details: {
  members: userData[]
  isPublic: boolean
}): BookAudience => ({
  isPublic: details.isPublic,
  members: details.members.map(memberKey).filter(Boolean)
})

/** True when everyone who can read a book of `inner` can read one of `outer`. */
export const isAudienceWithin = (
  inner: BookAudience,
  outer: BookAudience
): boolean =>
  outer.isPublic ||
  (!inner.isPublic &&
    inner.members.every(member => outer.members.includes(member)))
