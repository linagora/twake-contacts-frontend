import React from 'react'
import { AddressBook } from '@common/features/Contacts/contactsTypes'
import { Icon, Peoples } from '@linagora/twake-icons'
import { Stack, Typography } from '@linagora/twake-mui'
import { useI18n } from 'twake-i18n'
import { getSharingStatus } from './sharingStatus'

export interface AddressBookSharingStatusProps {
  book: AddressBook
}

/** Tells who shared a book with the user; nothing for own or private books. */
export const AddressBookSharingStatus: React.FC<
  AddressBookSharingStatusProps
> = ({ book }) => {
  const { t } = useI18n()
  const status = getSharingStatus(book)
  if (status?.kind !== 'sharedWithMe') return null

  return (
    <Stack direction="row" spacing={0.5} className="u-flex-items-center">
      <Icon icon={Peoples} size={16} />
      <Typography variant="body2" color="text.secondary">
        {t('contacts.addressBook.sharedBy', {
          owner: status.owner,
          role: t(status.roleKey)
        })}
      </Typography>
    </Stack>
  )
}
