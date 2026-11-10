import React from 'react'
import { AddressBook } from '@common/features/Contacts/contactsTypes'
import { Icon, Peoples, ShareExternal } from '@linagora/twake-icons'
import { Button, Stack, Typography } from '@linagora/twake-mui'
import { useI18n } from 'twake-i18n'
import { getSharingStatus, SharingStatus } from './sharingStatus'

export interface AddressBookSharingStatusProps {
  book: AddressBook
  // opens the sharing settings, when the user may change them
  onOpenShare?: () => void
}

const useSharingStatusLabel = (status: SharingStatus): string => {
  const { t } = useI18n()
  if (status.kind === 'sharedWithMe') {
    return t('contacts.addressBook.sharedBy', {
      owner: status.owner,
      role: t(status.roleKey)
    })
  }
  return [
    status.membersCount > 0 &&
      t('contacts.addressBook.sharedWith', {
        smart_count: status.membersCount
      }),
    status.isPublic && t('contacts.addressBook.public')
  ]
    .filter(Boolean)
    .join(' · ')
}

const SharingStatusLine: React.FC<{
  status: SharingStatus
  onOpenShare?: () => void
}> = ({ status, onOpenShare }) => {
  const label = useSharingStatusLabel(status)
  const icon = (
    <Icon icon={status.kind === 'owned' ? ShareExternal : Peoples} size={16} />
  )

  if (onOpenShare) {
    return (
      <Button
        variant="text"
        size="small"
        startIcon={icon}
        onClick={onOpenShare}
      >
        {label}
      </Button>
    )
  }
  return (
    <Stack direction="row" spacing={0.5} className="u-flex-items-center">
      {icon}
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
    </Stack>
  )
}

/** Tells who can read the book; nothing for a private book. */
export const AddressBookSharingStatus: React.FC<
  AddressBookSharingStatusProps
> = ({ book, onOpenShare }) => {
  const status = getSharingStatus(book)
  if (!status) return null
  return <SharingStatusLine status={status} onOpenShare={onOpenShare} />
}
