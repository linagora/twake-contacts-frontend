import { ContactEntry } from '@common/features/Contacts/contactsTypes'
import {
  Skeleton,
  Stack,
  VirtualizedTable,
  VirtualizedTableColumn,
  VirtualizedTableRow
} from '@linagora/twake-mui'
import React from 'react'
import { useLocation, useNavigate } from 'react-router'
import { useI18n } from 'twake-i18n'
import { ContactCell } from './ContactCell'

interface ContactsTableProps {
  entries: ContactEntry[]
  onEndReached: () => void
  loading?: boolean
  loadingMore?: boolean
}

const LOADING_MORE_ROWS: VirtualizedTableRow[] = [0, 1].map(i => ({
  id: `loading-more-${i}`,
  loadingMore: true
}))

export const ContactsTable: React.FC<ContactsTableProps> = ({
  entries,
  onEndReached,
  loading = false,
  loadingMore = false
}) => {
  const { t } = useI18n()
  const navigate = useNavigate()
  const location = useLocation()

  // We don't sort using the virtualized tables as we load entries
  // using lazy loading
  const columns: VirtualizedTableColumn[] = [
    {
      id: 'contact.displayName',
      label: t('contacts.name'),
      width: 300,
      sortable: false,
      skeleton: (
        <Stack direction="row" className="u-flex-items-center">
          <Skeleton
            className="u-mr-1"
            animation="wave"
            variant="circular"
            width={24}
            height={24}
          />
          <Skeleton animation="wave" variant="text" width={200} />
        </Stack>
      )
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
      disableClick: true,
      skeleton: (
        <Skeleton
          className="u-ml-auto"
          animation="wave"
          variant="circular"
          width={30}
          height={30}
        />
      )
    }
  ]

  const rows: VirtualizedTableRow[] = [
    ...entries.map(entry => ({
      id: `${entry.addressBookId}/${entry.contact.id}`,
      ...entry
    })),
    ...(loadingMore ? LOADING_MORE_ROWS : [])
  ]

  const handleClick = (row: VirtualizedTableRow): void => {
    if (row.loadingMore) return
    const { addressBookId, contact } = row as unknown as ContactEntry
    void navigate(`/contacts/${addressBookId}/${contact.id}`, {
      state: { from: location.pathname }
    })
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
          children: <ContactCell />
        }
      }}
      isLoading={loading}
    />
  )
}
