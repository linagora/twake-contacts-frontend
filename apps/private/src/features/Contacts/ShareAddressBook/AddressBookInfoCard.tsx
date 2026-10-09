import React from 'react'
import { Stack, Typography, Avatar } from '@linagora/twake-mui'
import { Icon, Peoples } from '@linagora/twake-icons'
import { AddressBook } from '@common/features/Contacts/contactsTypes'
import { useI18n } from 'twake-i18n'

interface AddressBookInfoCardProps {
  book: AddressBook
}

export const AddressBookInfoCard: React.FC<AddressBookInfoCardProps> = ({
  book
}) => {
  const { t } = useI18n()

  return (
    <div
      className="u-pv-1 u-ph-2 u-bdrs-6 u-flex u-flex-items-center"
      style={{ backgroundColor: 'var(--twake-palette-background-contrast)' }}
    >
      <Avatar
        sx={{ height: 32, width: 32 }}
        style={{ backgroundColor: '#60A5FA', color: 'white' }}
      >
        <Icon icon={Peoples} />
      </Avatar>
      <Stack className="u-ml-1">
        <Typography variant="body1" className="u-fw-500">
          {book?.name}
        </Typography>
        <Typography variant="caption" color="textSecondary">
          {t('contacts.share.contactsCount', {
            count: book?.contactsCount || 0
          })}
        </Typography>
      </Stack>
    </div>
  )
}
