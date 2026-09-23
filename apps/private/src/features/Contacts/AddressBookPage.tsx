import { useAppSelector } from '@common/app/hooks'
import {
  selectBook,
  selectContactEntries
} from '@common/features/Contacts/contactsSelectors'
import { getAddressBookDisplayName } from '@common/features/Contacts/contactsUtils'
import { Stack, Typography } from '@linagora/twake-mui'
import { useParams } from 'react-router-dom'
import { useI18n } from 'twake-i18n'
import { ContactSearchBar } from './ContactSearchBar'
import { ContactsTable } from './ContactsTable'
import { NoContactsEmptyState } from './NoContactsEmptyState'

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
    <Stack spacing={2} className="u-flex-auto u-ov-hidden">
      <ContactSearchBar />
      <Typography variant="h4" gutterBottom>
        {title}
      </Typography>
      {entries.length === 0 ? (
        <NoContactsEmptyState />
      ) : (
        <ContactsTable entries={entries} readOnly={addressBookId === 'dab'} />
      )}
    </Stack>
  )
}
