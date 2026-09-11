import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@linagora/twake-mui'
import { Contact } from '@common/features/Contacts/contactsTypes'
import { useI18n } from 'twake-i18n'
import { ContactRow } from './ContactRow'

export interface ContactEntry {
  addressBookId: string
  contact: Contact
}

interface ContactsTableProps {
  entries: ContactEntry[]
}

export const ContactsTable: React.FC<ContactsTableProps> = ({ entries }) => {
  const { t } = useI18n()

  return (
    <TableContainer>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>{t('contacts.name')}</TableCell>
            <TableCell>{t('contacts.email')}</TableCell>
            <TableCell>{t('contacts.phone')}</TableCell>
            <TableCell>{t('contacts.team')}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {entries.map(({ addressBookId, contact }) => (
            <ContactRow
              key={`${addressBookId}/${contact.id}`}
              contact={contact}
              addressBookId={addressBookId}
            />
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  )
}
