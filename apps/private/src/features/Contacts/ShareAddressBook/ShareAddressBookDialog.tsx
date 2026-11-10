import React, { useEffect, useCallback, useMemo, useRef } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Stack,
  Alert,
  Box
} from '@linagora/twake-mui'
import { Cross, Icon } from '@linagora/twake-icons'
import { useI18n } from 'twake-i18n'
import { useAppSelector, useAppDispatch } from '@common/app/hooks'
import { ContrastToggle } from '@common/components/ContrastToggle/ContrastToggle'
import {
  fetchAddressBookDetail,
  updateAddressBookShares
} from '@common/features/Contacts/ContactsSlice'
import { AddressBookAccessLevel } from '@common/features/Contacts/davTypes'
import { userData as UserDataType } from '@common/features/User/userDataTypes'
import { buildFullShareesList } from '@common/features/Contacts/transformer/ContactsTransformer'
import { toContactsErrorKey } from '@common/features/Contacts/contactsUtils'
import { RejectedError } from '@common/utils/errorUtils'

import { useLiveAnnouncement } from '../useLiveAnnouncement'
import { AddressBookInfoCard } from './AddressBookInfoCard'
import { InviteSection } from './InviteSection'
import { MembersList } from './MembersList'
import { DiscoverySection } from './DiscoverySection'

const SHARE_STATUS_DURATION_MS = 5000

interface ShareAddressBookDialogProps {
  addressBookId: string
  onClose: () => void
}

const useAddressBookSharingState = (
  userData: { openpaasId?: string },
  book: { id?: string; invitedMembers?: UserDataType[] } | undefined,
  dispatch: ReturnType<typeof useAppDispatch>
): {
  isSharing: boolean
  setIsSharing: React.Dispatch<React.SetStateAction<boolean>>
  updatingMemberId: string | null
  setUpdatingMemberId: React.Dispatch<React.SetStateAction<string | null>>
  setRemovedIds: React.Dispatch<React.SetStateAction<string[]>>
  invitedMembers: UserDataType[]
  activeInvitedMembers: UserDataType[]
  detailsError: string | null
  clearDetailsError: () => void
} => {
  const [isSharing, setIsSharing] = React.useState(false)
  const [updatingMemberId, setUpdatingMemberId] = React.useState<string | null>(
    null
  )
  const [removedIds, setRemovedIds] = React.useState<string[]>([])
  // the failure to fetch the members of a book, reported for that book only
  const [detailsFailure, setDetailsFailure] = React.useState<{
    bookId: string
    errorKey: string
  } | null>(null)

  useEffect(() => {
    const bookId = book?.id
    if (!userData.openpaasId || !bookId) return
    dispatch(
      fetchAddressBookDetail({
        userId: userData.openpaasId,
        addressBookId: bookId
      })
    )
      .unwrap()
      .catch((error: RejectedError | undefined) => {
        if (error?.status !== 401) {
          setDetailsFailure({
            bookId,
            errorKey: toContactsErrorKey(error, 'contacts.errors.loadMembers')
          })
        }
      })
  }, [dispatch, book?.id, userData.openpaasId])
  const detailsError =
    detailsFailure && detailsFailure.bookId === book?.id
      ? detailsFailure.errorKey
      : null
  const clearDetailsError = useCallback(() => setDetailsFailure(null), [])

  const invitedMembers = useMemo(
    () => book?.invitedMembers || [],
    [book?.invitedMembers]
  )
  const activeInvitedMembers = useMemo(
    () =>
      invitedMembers.filter(
        m => !m.openpaasId || !removedIds.includes(m.openpaasId)
      ),
    [invitedMembers, removedIds]
  )

  return {
    isSharing,
    setIsSharing,
    updatingMemberId,
    setUpdatingMemberId,
    setRemovedIds,
    invitedMembers,
    activeInvitedMembers,
    detailsError,
    clearDetailsError
  }
}

interface ExecuteShareUpdatesParams {
  userDataId: string | undefined
  bookId: string | undefined
  invitedMembers: UserDataType[]
  dispatch: ReturnType<typeof useAppDispatch>
  updates: { userId: string; role: AddressBookAccessLevel; href: string }[]
  onSuccess?: () => void
  onError?: (error: unknown) => void
  onSettled?: () => void
  reportError: (errorKey: string | null) => void
  onDetailsRefreshed: () => void
}

type ShareOutcome =
  | { status: 'skipped' }
  | { status: 'shared' }
  | { status: 'failed'; errorKey: string }

const executeShareUpdates = async ({
  userDataId,
  bookId,
  invitedMembers,
  dispatch,
  updates,
  onSuccess,
  onError,
  onSettled,
  reportError,
  onDetailsRefreshed
}: ExecuteShareUpdatesParams): Promise<ShareOutcome> => {
  if (!userDataId || !bookId) return { status: 'skipped' }
  reportError(null)

  const sharees = buildFullShareesList(userDataId, invitedMembers, updates)

  try {
    await dispatch(
      updateAddressBookShares({
        userId: userDataId,
        addressBookId: bookId,
        sharees
      })
    ).unwrap()
    // the members listed again supersede a former failure to list them
    dispatch(
      fetchAddressBookDetail({
        userId: userDataId,
        addressBookId: bookId,
        silent: true
      })
    )
      .unwrap()
      .then(onDetailsRefreshed)
      .catch(() => undefined)
    onSuccess?.()
    return { status: 'shared' }
  } catch (error) {
    console.error('Failed to update shares', error)
    onError?.(error)
    const errorKey = toContactsErrorKey(
      error as RejectedError,
      'contacts.errors.share'
    )
    reportError(errorKey)
    return { status: 'failed', errorKey }
  } finally {
    onSettled?.()
  }
}

interface HandleShareParams {
  userDataId: string | undefined
  bookId: string | undefined
  invitedMembers: UserDataType[]
  dispatch: ReturnType<typeof useAppDispatch>
  setIsSharing: (s: boolean) => void
  setRemovedIds: React.Dispatch<React.SetStateAction<string[]>>
  reportError: (errorKey: string | null) => void
  onDetailsRefreshed: () => void
}

const createHandleShare =
  ({
    userDataId,
    bookId,
    invitedMembers,
    dispatch,
    setIsSharing,
    setRemovedIds,
    reportError,
    onDetailsRefreshed
  }: HandleShareParams): ((
    users: UserDataType[],
    role: AddressBookAccessLevel
  ) => Promise<ShareOutcome>) =>
  async (
    users: UserDataType[],
    role: AddressBookAccessLevel
  ): Promise<ShareOutcome> => {
    setIsSharing(true)
    const updates = users
      .filter(u => u.openpaasId)
      .map(u => ({
        userId: u.openpaasId || '',
        role,
        href: u.href || `mailto:${u.email}`
      }))

    return executeShareUpdates({
      userDataId,
      bookId,
      invitedMembers,
      dispatch,
      updates,
      // A member removed earlier in this dialog session must show up again
      onSuccess: () => {
        const sharedIds = updates.map(u => u.userId)
        setRemovedIds(prev => prev.filter(id => !sharedIds.includes(id)))
      },
      onSettled: () => setIsSharing(false),
      reportError,
      onDetailsRefreshed
    })
  }

interface HandleUpdateMemberParams {
  userDataId: string | undefined
  bookId: string | undefined
  invitedMembers: UserDataType[]
  dispatch: ReturnType<typeof useAppDispatch>
  setRemovedIds: React.Dispatch<React.SetStateAction<string[]>>
  setUpdatingMemberId: (id: string | null) => void
  reportError: (errorKey: string | null) => void
  onDetailsRefreshed: () => void
}

const createHandleUpdateMember =
  ({
    userDataId,
    bookId,
    invitedMembers,
    dispatch,
    setRemovedIds,
    setUpdatingMemberId,
    reportError,
    onDetailsRefreshed
  }: HandleUpdateMemberParams): ((
    user: UserDataType,
    role: AddressBookAccessLevel
  ) => Promise<void>) =>
  async (user: UserDataType, role: AddressBookAccessLevel): Promise<void> => {
    if (!user.openpaasId) return

    if (role === AddressBookAccessLevel.None) {
      setRemovedIds(prev => [...prev, user.openpaasId || ''])
    } else {
      setUpdatingMemberId(user.openpaasId)
    }

    const updates = [
      {
        userId: user.openpaasId,
        role,
        href: user.href || `mailto:${user.email}`
      }
    ]

    await executeShareUpdates({
      userDataId,
      bookId,
      invitedMembers,
      dispatch,
      updates,
      onError: () => {
        if (role === AddressBookAccessLevel.None) {
          setRemovedIds(prev => prev.filter(id => id !== user.openpaasId))
        }
      },
      onSettled: () => setUpdatingMemberId(null),
      reportError,
      onDetailsRefreshed
    })
  }

interface AddressBookSharingActionsParams {
  userData: { openpaasId?: string }
  book: { id?: string; invitedMembers?: UserDataType[] } | undefined
  dispatch: ReturnType<typeof useAppDispatch>
  invitedMembers: UserDataType[]
  setIsSharing: (s: boolean) => void
  setUpdatingMemberId: (id: string | null) => void
  setRemovedIds: React.Dispatch<React.SetStateAction<string[]>>
  reportError: (errorKey: string | null) => void
  onDetailsRefreshed: () => void
}

const useAddressBookSharingActions = ({
  userData,
  book,
  dispatch,
  invitedMembers,
  setIsSharing,
  setUpdatingMemberId,
  setRemovedIds,
  reportError,
  onDetailsRefreshed
}: AddressBookSharingActionsParams): {
  handleShare: (
    users: UserDataType[],
    role: AddressBookAccessLevel
  ) => Promise<ShareOutcome>
  handleUpdateMember: (
    user: UserDataType,
    role: AddressBookAccessLevel
  ) => Promise<void>
} => {
  const handleShare = useCallback(
    async (users: UserDataType[], role: AddressBookAccessLevel) => {
      const handler = createHandleShare({
        userDataId: userData.openpaasId,
        bookId: book?.id,
        invitedMembers,
        dispatch,
        setIsSharing,
        setRemovedIds,
        reportError,
        onDetailsRefreshed
      })
      return handler(users, role)
    },
    [
      userData.openpaasId,
      book?.id,
      invitedMembers,
      dispatch,
      setIsSharing,
      setRemovedIds,
      reportError,
      onDetailsRefreshed
    ]
  )

  const handleUpdateMember = useCallback(
    async (user: UserDataType, role: AddressBookAccessLevel) => {
      const handler = createHandleUpdateMember({
        userDataId: userData.openpaasId,
        bookId: book?.id,
        invitedMembers,
        dispatch,
        setRemovedIds,
        setUpdatingMemberId,
        reportError,
        onDetailsRefreshed
      })
      await handler(user, role)
    },
    [
      userData.openpaasId,
      book?.id,
      invitedMembers,
      dispatch,
      setRemovedIds,
      setUpdatingMemberId,
      reportError,
      onDetailsRefreshed
    ]
  )

  return {
    handleShare,
    handleUpdateMember
  }
}

export const ShareAddressBookDialog: React.FC<ShareAddressBookDialogProps> = ({
  addressBookId,
  onClose
}) => {
  const { t } = useI18n()
  const dispatch = useAppDispatch()
  const userData = useAppSelector(state => state.user.userData)
  const book = useAppSelector(
    state => state.contacts.addressBooks[addressBookId]
  )
  const {
    isSharing,
    setIsSharing,
    updatingMemberId,
    setUpdatingMemberId,
    setRemovedIds,
    invitedMembers,
    activeInvitedMembers,
    detailsError,
    clearDetailsError
  } = useAddressBookSharingState(userData, book, dispatch)
  const [shareError, setShareError] = React.useState<string | null>(null)
  // Removing a member unmounts its focused row: keep the focus in the dialog
  const searchInputRef = useRef<HTMLInputElement>(null)

  const { handleShare, handleUpdateMember } = useAddressBookSharingActions({
    userData,
    book,
    dispatch,
    invitedMembers,
    setIsSharing,
    setUpdatingMemberId,
    setRemovedIds,
    reportError: setShareError,
    onDetailsRefreshed: clearDetailsError
  })
  const { message: shareStatus, announce } = useLiveAnnouncement(
    SHARE_STATUS_DURATION_MS
  )

  const shareAndAnnounce = async (
    users: UserDataType[],
    role: AddressBookAccessLevel
  ): Promise<void> => {
    const outcome = await handleShare(users, role)
    if (outcome.status === 'shared') {
      const sharedUsers = users.filter(u => u.openpaasId)
      announce(
        t('contacts.share.sentStatus', {
          smart_count: sharedUsers.length,
          names: sharedUsers.map(u => u.name || u.email).join(', ')
        })
      )
    } else if (outcome.status === 'failed') {
      announce(t(outcome.errorKey))
    }
  }

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle className="u-pb-0">
        <Stack
          direction="row"
          className="u-flex-items-center u-flex-justify-between"
        >
          {t('contacts.share.title', {
            name: book?.name || t('contacts.share.defaultAddressBookName')
          })}
          <Stack direction="row" className="u-flex-items-center">
            <ContrastToggle />
            <IconButton
              edge="end"
              aria-label={t('contacts.form.close')}
              onClick={onClose}
            >
              <Icon icon={Cross} />
            </IconButton>
          </Stack>
        </Stack>
      </DialogTitle>

      <DialogContent className="u-pb-2 u-pt-1">
        <Box role="status" aria-live="polite" className="u-visuallyhidden">
          {shareStatus}
        </Box>
        <AddressBookInfoCard book={book} />
        {shareError && (
          <Alert
            severity="error"
            className="u-mt-1"
            onClose={() => setShareError(null)}
          >
            {t(shareError)}
          </Alert>
        )}
        <InviteSection
          currentUserId={userData.openpaasId}
          invitedMembers={activeInvitedMembers}
          onShare={(users, role) => void shareAndAnnounce(users, role)}
          loading={isSharing}
          searchInputRef={searchInputRef}
        />
        {detailsError ? (
          <Alert severity="error" className="u-mt-1">
            {t(detailsError)}
          </Alert>
        ) : (
          <MembersList
            userData={userData}
            invitedMembers={activeInvitedMembers}
            onUpdateMember={(user, role) => {
              if (role === AddressBookAccessLevel.None) {
                searchInputRef.current?.focus()
              }
              void handleUpdateMember(user, role)
            }}
            updatingMemberId={updatingMemberId}
          />
        )}
        <DiscoverySection
          userId={userData.openpaasId}
          addressBookId={book?.id}
        />
      </DialogContent>
    </Dialog>
  )
}
