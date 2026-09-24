import { ContactEntry } from '@common/features/Contacts/contactsTypes'
import {
  VirtualizedTable,
  VirtualizedTableColumn,
  VirtualizedTableRow
} from '@linagora/twake-mui'
import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useI18n } from 'twake-i18n'
import { ContactCell } from './ContactCell'

interface ContactsTableProps {
  entries: ContactEntry[]
  readOnly?: boolean
  onEndReached: () => void
}

export const ContactsTable: React.FC<ContactsTableProps> = ({
  entries,
  readOnly,
  onEndReached
}) => {
  const { t } = useI18n()
  const navigate = useNavigate()

  // We don't sort using the virtualized tables as we load entries
  // using lazy loading
  const columns: VirtualizedTableColumn[] = [
    {
      id: 'contact.displayName',
      label: t('contacts.name'),
      width: 300,
      sortable: false
    },
    {
      id: 'contact.emails.0.value',
      label: t('contacts.email'),
      width: 300,
      noWrap: true,
      sortable: false
    },
    {
      id: 'contact.phones.0.value',
      label: t('contacts.phone'),
      width: 150,
      maxWidth: 150,
      noWrap: true,
      sortable: false
    },
    {
      id: 'contact.categories',
      label: t('contacts.team'),
      width: 180,
      maxWidth: 180,
      sortable: false
    },
    {
      id: 'actions',
      width: 92,
      maxWidth: 92,
      sortable: false,
      disableClick: true
    }
  ]

  const rows: VirtualizedTableRow[] = entries.map(entry => ({
    id: `${entry.addressBookId}/${entry.contact.id}`,
    ...entry
  }))

  const handleClick = (row: VirtualizedTableRow): void => {
    const { addressBookId, contact } = row as unknown as ContactEntry
    void navigate(`/contacts/${addressBookId}/${contact.id}`)
  }

  return (
    <VirtualizedTable
      rows={rows}
      columns={columns}
      computeItemKey={(_, row) => String(row.id)}
      endReached={onEndReached}
      componentsProps={{
        rowContent: {
          onClick: handleClick,
          children: <ContactCell readOnly={readOnly} />
        }
      }}
    />
  )
}
