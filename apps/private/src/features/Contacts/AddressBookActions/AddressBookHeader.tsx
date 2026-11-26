import React from 'react'
import { AddressBook } from '@common/features/Contacts/contactsTypes'
import { getAddressBookDisplayName } from '@common/features/Contacts/contactsUtils'
import { Icon, ShareExternal } from '@linagora/twake-icons'
import { Button, Stack, Typography } from '@linagora/twake-mui'
import { useNavigate } from 'react-router'
import { useI18n } from 'twake-i18n'
import { AddressBookMoreActionsButton } from './AddressBookMoreActionsButton'
import { AddressBookSharingStatus } from './AddressBookSharingStatus'
import { FOCUS_HEADING_STATE } from '../focusHeadingOnArrival'
import { useAddressBookActions } from './useAddressBookActions'

export interface AddressBookHeaderProps {
  book: AddressBook
  // the actions of the page shown after the actions on the book
  children?: React.ReactNode
  // the page focuses its title on arrival after an action, see focusHeadingOnArrival
  headingRef?: React.Ref<HTMLHeadingElement>
}

/** The title of the page of a book, who can read it and its actions. */
export const AddressBookHeader: React.FC<AddressBookHeaderProps> = ({
  book,
  children,
  headingRef
}) => {
  const { t } = useI18n()
  const navigate = useNavigate()
  const actions = useAddressBookActions({
    book,
    onRemoved: () => void navigate('/contacts', { state: FOCUS_HEADING_STATE })
  })
  const canShare = book.capabilities.share

  return (
    <Stack
      direction="row"
      spacing={2}
      className="u-flex-justify-between u-flex-items-center u-w-100"
    >
      <Stack spacing={0.5} className="u-flex-items-start u-ov-hidden">
        <Typography
          variant="h4"
          component="h1"
          className="u-ellipsis u-w-100"
          ref={headingRef}
          tabIndex={headingRef ? -1 : undefined}
        >
          {getAddressBookDisplayName(book, t)}
        </Typography>
        <AddressBookSharingStatus book={book} />
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
        {children}
        <AddressBookMoreActionsButton actions={actions} />
      </Stack>
      {actions.dialogs}
    </Stack>
  )
}
