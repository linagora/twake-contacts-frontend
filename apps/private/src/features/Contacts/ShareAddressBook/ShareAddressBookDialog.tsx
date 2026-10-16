import React, { useEffect, useCallback, useMemo } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Stack,
  Alert
} from '@linagora/twake-mui'
import { Cross, Icon } from '@linagora/twake-icons'
import { useI18n } from 'twake-i18n'
import { useAppSelector, useAppDispatch } from '@common/app/hooks'
import {
  fetchAddressBookDetail,
  updateAddressBookShares
} from '@common/features/Contacts/ContactsSlice'
import { AddressBookAccessLevel } from '@common/features/Contacts/davTypes'
import { userData as UserDataType } from '@common/features/User/userDataTypes'
import { buildFullShareesList } from '@common/features/Contacts/transformer/ContactsTransformer'
import { toContactsErrorKey } from '@common/features/Contacts/contactsUtils'
import { RejectedError } from '@common/utils/errorUtils'

import { AddressBookInfoCard } from './AddressBookInfoCard'
import { InviteSection } from './InviteSection'
import { MembersList } from './MembersList'

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
} => {
  const [isSharing, setIsSharing] = React.useState(false)
  const [updatingMemberId, setUpdatingMemberId] = React.useState<string | null>(
    null
  )
  const [removedIds, setRemovedIds] = React.useState<string[]>([])

  useEffect(() => {
    if (userData.openpaasId && book?.id) {
      void dispatch(
        fetchAddressBookDetail({
          userId: userData.openpaasId,
          addressBookId: book.id
        })
      )
    }
  }, [dispatch, book?.id, userData.openpaasId])

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
    activeInvitedMembers
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
}

const executeShareUpdates = async ({
  userDataId,
  bookId,
  invitedMembers,
  dispatch,
  updates,
  onSuccess,
  onError,
  onSettled,
  reportError
}: ExecuteShareUpdatesParams): Promise<void> => {
  if (!userDataId || !bookId) return
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
    void dispatch(
      fetchAddressBookDetail({
        userId: userDataId,
        addressBookId: bookId,
        silent: true
      })
    )
    onSuccess?.()
  } catch (error) {
    console.error('Failed to update shares', error)
    onError?.(error)
    reportError(
      toContactsErrorKey(error as RejectedError, 'contacts.errors.share')
    )
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
  reportError: (errorKey: string | null) => void
}

const createHandleShare =
  ({
    userDataId,
    bookId,
    invitedMembers,
    dispatch,
    setIsSharing,
    reportError
  }: HandleShareParams): ((
    users: UserDataType[],
    role: AddressBookAccessLevel
  ) => Promise<void>) =>
  async (
    users: UserDataType[],
    role: AddressBookAccessLevel
  ): Promise<void> => {
    setIsSharing(true)
    const updates = users
      .filter(u => u.openpaasId)
      .map(u => ({
        userId: u.openpaasId || '',
        role,
        href: u.href || `mailto:${u.email}`
      }))

    await executeShareUpdates({
      userDataId,
      bookId,
      invitedMembers,
      dispatch,
      updates,
      onSettled: () => setIsSharing(false),
      reportError
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
}

const createHandleUpdateMember =
  ({
    userDataId,
    bookId,
    invitedMembers,
    dispatch,
    setRemovedIds,
    setUpdatingMemberId,
    reportError
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
      reportError
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
}

const useAddressBookSharingActions = ({
  userData,
  book,
  dispatch,
  invitedMembers,
  setIsSharing,
  setUpdatingMemberId,
  setRemovedIds,
  reportError
}: AddressBookSharingActionsParams): {
  handleShare: (
    users: UserDataType[],
    role: AddressBookAccessLevel
  ) => Promise<void>
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
        reportError
      })
      await handler(users, role)
    },
    [
      userData.openpaasId,
      book?.id,
      invitedMembers,
      dispatch,
      setIsSharing,
      reportError
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
        reportError
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
      reportError
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
    activeInvitedMembers
  } = useAddressBookSharingState(userData, book, dispatch)
  const [shareError, setShareError] = React.useState<string | null>(null)

  const { handleShare, handleUpdateMember } = useAddressBookSharingActions({
    userData,
    book,
    dispatch,
    invitedMembers,
    setIsSharing,
    setUpdatingMemberId,
    setRemovedIds,
    reportError: setShareError
  })

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
          <IconButton
            edge="end"
            aria-label={t('contacts.form.close')}
            onClick={onClose}
          >
            <Icon icon={Cross} />
          </IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent className="u-pb-2 u-pt-1">
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
          onShare={(users, role) => void handleShare(users, role)}
          loading={isSharing}
        />
        <MembersList
          userData={userData}
          invitedMembers={activeInvitedMembers}
          onUpdateMember={(user, role) => void handleUpdateMember(user, role)}
          updatingMemberId={updatingMemberId}
        />
      </DialogContent>
    </Dialog>
  )
}
