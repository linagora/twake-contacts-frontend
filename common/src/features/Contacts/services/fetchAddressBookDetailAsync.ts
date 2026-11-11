import { createAction, ReducerCreators } from '@reduxjs/toolkit'
import { RejectedError, toRejectedError } from '@common/utils/errorUtils'
import {
  fetchAddressBookDetails,
  resolveAddressBookMember
} from '../ContactsDao'
import { ContactsState } from '../contactsTypes'
import { createDictionary } from '@common/utils/dictionary'
import { userData } from '@common/features/User/userDataTypes'

export interface FetchAddressBookDetailPayload {
  userId: string
  addressBookId: string
  silent?: boolean
}

interface DetailRequest {
  addressBookId: string
  requestId: string
}

/** The members of the book are known, their profiles are not yet. */
export const addressBookDetailReceived = createAction<
  DetailRequest & { members: userData[]; isPublic: boolean; silent?: boolean }
>('contacts/addressBookDetailReceived')

/** The profile of one member of the book has been looked up. */
export const addressBookMemberResolved = createAction<
  DetailRequest & { member: userData }
>('contacts/addressBookMemberResolved')

const isLatestDetailRequest = (
  state: ContactsState,
  { addressBookId, requestId }: DetailRequest
): boolean =>
  state.detailRequestIds?.[addressBookId] === requestId &&
  Boolean(state.addressBooks[addressBookId])

/**
 * A member already listed keeps its looked up profile, with its new role,
 * instead of falling back to its invite until its lookup answers again.
 */
const keepKnownProfiles = (
  known: userData[],
  received: userData[]
): userData[] =>
  received.map(member => {
    const knownMember = known.find(k => member.href && k.href === member.href)
    return knownMember ? { ...knownMember, role: member.role } : member
  })

export const reduceAddressBookDetailReceived = (
  state: ContactsState,
  action: ReturnType<typeof addressBookDetailReceived>
): void => {
  const { addressBookId, members, isPublic, silent } = action.payload
  if (!silent) {
    state.detailsLoading = false
  }
  if (isLatestDetailRequest(state, action.payload)) {
    const book = state.addressBooks[addressBookId]
    state.addressBooks[addressBookId] = {
      ...book,
      invitedMembers: keepKnownProfiles(book.invitedMembers ?? [], members),
      isPublic
    }
  }
}

export const reduceAddressBookMemberResolved = (
  state: ContactsState,
  action: ReturnType<typeof addressBookMemberResolved>
): void => {
  const { addressBookId, member } = action.payload
  if (!isLatestDetailRequest(state, action.payload)) return
  const book = state.addressBooks[addressBookId]
  book.invitedMembers = book.invitedMembers?.map(m =>
    m.href === member.href ? member : m
  )
}

export const fetchAddressBookDetailThunk = (
  create: ReducerCreators<ContactsState>
): ReturnType<
  typeof create.asyncThunk<
    { addressBookId: string },
    FetchAddressBookDetailPayload,
    { rejectValue: RejectedError }
  >
> =>
  create.asyncThunk<
    { addressBookId: string },
    FetchAddressBookDetailPayload,
    { rejectValue: RejectedError }
  >(
    async (
      { userId, addressBookId, silent },
      { dispatch, requestId, rejectWithValue }
    ) => {
      let details: { members: userData[]; isPublic: boolean }
      try {
        details = await fetchAddressBookDetails(userId, addressBookId)
      } catch (err) {
        return rejectWithValue(toRejectedError(err))
      }
      // the members are listed at once, each completed when its lookup answers
      dispatch(
        addressBookDetailReceived({
          addressBookId,
          requestId,
          silent,
          ...details
        })
      )
      await Promise.all(
        details.members.map(async member => {
          const resolved = await resolveAddressBookMember(member)
          // a member whose lookup failed keeps the entry already listed
          if (resolved === member) return
          dispatch(
            addressBookMemberResolved({
              addressBookId,
              requestId,
              member: resolved
            })
          )
        })
      )
      return { addressBookId }
    },
    {
      pending: (state, action) => {
        state.detailRequestIds ??= createDictionary()
        state.detailRequestIds[action.meta.arg.addressBookId] =
          action.meta.requestId
        if (!action.meta.arg.silent) {
          state.detailsLoading = true
        }
      },
      // the failure belongs to the dialog that asked for the details, not to
      // the contact list: it is reported there
      rejected: (state, action) => {
        if (!action.meta.arg.silent) {
          state.detailsLoading = false
        }
      }
    }
  )
