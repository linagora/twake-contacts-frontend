import { useI18n } from 'twake-i18n'
import { AddressBook } from '@common/features/Contacts/contactsTypes'
import { getAddressBookDisplayName } from '@common/features/Contacts/contactsUtils'
import { EntryPaper } from './EntryPaper'
import { Icon, Peoples } from '@linagora/twake-icons'

export function AddressBookPaper({
  book,
  ownerName,
  onRemove
}: {
  book: AddressBook
  ownerName?: string
  onRemove?: () => void
}): React.JSX.Element {
  const { t } = useI18n()
  const count =
    book.contactsCount != null
      ? t('contacts.addressBook.contactsCount', {
          smart_count: book.contactsCount
        })
      : undefined
  return (
    <EntryPaper
      avatar={<Icon icon={Peoples} />}
      primary={getAddressBookDisplayName(book, t)}
      secondary={[ownerName, count].filter(Boolean).join(' · ') || undefined}
      onRemove={onRemove}
    />
  )
}
