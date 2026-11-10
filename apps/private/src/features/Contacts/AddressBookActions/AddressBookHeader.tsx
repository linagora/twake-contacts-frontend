import React, { useEffect } from 'react'
import { isOwnAddressBook } from '@common/features/Contacts/addressBookModel'
import { AddressBook } from '@common/features/Contacts/contactsTypes'
import { getAddressBookDisplayName } from '@common/features/Contacts/contactsUtils'
import { fetchAddressBookDetail } from '@common/features/Contacts/ContactsSlice'
import { useAppDispatch } from '@common/app/hooks'
import { Icon, ShareExternal } from '@linagora/twake-icons'
import { Button, Stack, Typography } from '@linagora/twake-mui'
import { useNavigate } from 'react-router'
import { useI18n } from 'twake-i18n'
import { AddressBookMoreActionsButton } from './AddressBookMoreActionsButton'
import { AddressBookSharingStatus } from './AddressBookSharingStatus'
import { useAddressBookActions } from './useAddressBookActions'

export interface AddressBookHeaderProps {
  book: AddressBook
  // the actions of the page shown after the actions on the book
  children?: React.ReactNode
}

// the members of a book of the user are only listed with its details: they
// are read on the page of the book to tell with how many people it is shared
const useOwnBookMembers = (book: AddressBook): void => {
  const dispatch = useAppDispatch()
  const isOwnBook = isOwnAddressBook(book)
  useEffect(() => {
    if (!isOwnBook) return
    void dispatch(
      fetchAddressBookDetail({
        userId: book.userId,
        addressBookId: book.id,
        silent: true
      })
    )
      .unwrap()
      .catch(() => undefined)
  }, [dispatch, isOwnBook, book.userId, book.id])
}

/** The title of the page of a book, who can read it and its actions. */
export const AddressBookHeader: React.FC<AddressBookHeaderProps> = ({
  book,
  children
}) => {
  const { t } = useI18n()
  const navigate = useNavigate()
  const actions = useAddressBookActions({
    book,
    onRemoved: () => void navigate('/contacts')
  })
  const canShare = book.capabilities.share
  useOwnBookMembers(book)

  return (
    <Stack
      direction="row"
      spacing={2}
      className="u-flex-justify-between u-flex-items-center u-w-100"
    >
      <Stack spacing={0.5} className="u-flex-items-start u-ov-hidden">
        <Typography variant="h4" className="u-ellipsis u-w-100">
          {getAddressBookDisplayName(book, t)}
        </Typography>
        <AddressBookSharingStatus
          book={book}
          onOpenShare={canShare ? actions.openShareDialog : undefined}
        />
      </Stack>
      <Stack direction="row" spacing={1} className="u-flex-items-center">
        {canShare && (
          <Button
            variant="outlined"
            startIcon={<Icon icon={ShareExternal} />}
            onClick={actions.openShareDialog}
          >
            {t('contacts.menu.share')}
          </Button>
        )}
        <AddressBookMoreActionsButton actions={actions} />
        {children}
      </Stack>
      {actions.dialogs}
    </Stack>
  )
}
