import React from 'react'
import {
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar
} from '@linagora/twake-mui'
import { Icon, Peoples } from '@linagora/twake-icons'
import { AddressBook } from '@common/features/Contacts/contactsTypes'
import { getAddressBookDisplayName } from '@common/features/Contacts/contactsUtils'
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
      className="u-pv-half u-ph-2 u-bdrs-6"
      style={{ backgroundColor: 'var(--twake-palette-background-contrast)' }}
    >
      <ListItem dense disableGutters>
        <ListItemAvatar className="u-miw-1">
          <Avatar
            sx={{ height: 32, width: 32 }}
            style={{ backgroundColor: '#60A5FA', color: 'white' }}
          >
            <Icon icon={Peoples} />
          </Avatar>
        </ListItemAvatar>
        <ListItemText
          primary={getAddressBookDisplayName(book, t)}
          secondary={
            typeof book?.contactsCount === 'number'
              ? t('contacts.share.contactsCount', {
                  smart_count: book.contactsCount
                })
              : undefined
          }
        />
      </ListItem>
    </div>
  )
}
