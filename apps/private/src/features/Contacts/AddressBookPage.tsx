import { Typography } from '@linagora/twake-mui'
import { useAppSelector } from '@common/app/hooks'
import { useParams } from 'react-router-dom'
import { useI18n } from 'twake-i18n'
import { ContactEntry, ContactsTable } from './ContactsTable'

export const AddressBookPage: React.FC = () => {
  const { t } = useI18n()
  const { addressBookId } = useParams()
  const book = useAppSelector(state =>
    state.contacts.addressBooks.find(b => b.id === addressBookId)
  )
  const entries = useAppSelector((state): ContactEntry[] => {
    const byBook = state.contacts.contactsByBook
    const bookIds = addressBookId ? [addressBookId] : Object.keys(byBook)
    return bookIds.flatMap(bookId =>
      (byBook[bookId] ?? []).map(contact => ({
        addressBookId: bookId,
        contact
      }))
    )
  })
  const title = addressBookId ? (book?.name ?? '') : t('contacts.myContacts')

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
