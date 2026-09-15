import { Typography } from '@linagora/twake-mui'
import { useAppSelector } from '@common/app/hooks'
import {
  selectBook,
  selectContactEntries
} from '@common/features/Contacts/contactsSelectors'
import { getAddressBookDisplayName } from '@common/features/Contacts/contactsUtils'
import { useParams } from 'react-router-dom'
import { useI18n } from 'twake-i18n'
import { ContactsTable } from './ContactsTable'

export const AddressBookPage: React.FC = () => {
  const { t } = useI18n()
  const { addressBookId } = useParams()
  const book = useAppSelector(state => selectBook(state, addressBookId))
  const entries = useAppSelector(state =>
    selectContactEntries(state, addressBookId)
  )
  const title = addressBookId
    ? getAddressBookDisplayName(book, t)
    : t('contacts.myContacts')

  return (
    <>
      <Typography variant="h4" gutterBottom>
        {title}
      </Typography>
      {entries.length === 0 ? (
        <Typography color="text.secondary">{t('contacts.empty')}</Typography>
      ) : (
        <ContactsTable entries={entries} />
      )}
    </>
  )
}
