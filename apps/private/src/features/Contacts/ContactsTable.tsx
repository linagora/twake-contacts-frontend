import { CONTACTS_PAGINATION_LIMIT } from '@common/features/Contacts/constants'
import {
  ContactEntry,
  ContactSort
} from '@common/features/Contacts/contactsTypes'
import {
  Skeleton,
  Stack,
  useBreakpoints,
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
  sort: ContactSort
  onSortChange: (sort: ContactSort) => void
  loading?: boolean
  loadingMore?: boolean
}

const makeLoadingRows = (count: number): VirtualizedTableRow[] =>
  Array.from({ length: count }, (_, i) => ({
    id: `loading-more-${i}`,
    loadingMore: true
  }))

// two rows under the loaded contacts, or a page of them while the first one
// loads, as after a sort, for the table to keep its height and scrollbar
const LOADING_MORE_ROWS = makeLoadingRows(2)
const LOADING_PAGE_ROWS = makeLoadingRows(CONTACTS_PAGINATION_LIMIT)

// the columns the server sorts the pages on
const SORT_COLUMN_IDS: Record<ContactSort['by'], string> = {
  fn: 'contact.displayName',
  email: 'contact.emails.0.value'
}

export const ContactsTable: React.FC<ContactsTableProps> = ({
  entries,
  onEndReached,
  sort,
  onSortChange,
  loading = false,
  loadingMore = false
}) => {
  const { t } = useI18n()
  const navigate = useNavigate()
  const location = useLocation()
  const { isMobile } = useBreakpoints()

  // maxWidth 0 on name and email: they share the space left by the fixed
  // columns, so a long value in the rendered rows can't resize the columns
  const allColumns: VirtualizedTableColumn[] = [
    {
      id: SORT_COLUMN_IDS.fn,
      label: t('contacts.name'),
      maxWidth: 0,
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
      id: SORT_COLUMN_IDS.email,
      label: t('contacts.email'),
      maxWidth: 0,
      noWrap: true
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

  const columns = isMobile
    ? allColumns.filter(
        col => col.id === SORT_COLUMN_IDS.fn || col.id === 'actions'
      )
    : allColumns

  const loadingRows = entries.length > 0 ? LOADING_MORE_ROWS : LOADING_PAGE_ROWS
  const rows: VirtualizedTableRow[] = [
    ...entries.map(entry => ({
      id: `${entry.addressBookId}/${entry.contact.id}`,
      ...entry
    })),
    ...(loadingMore ? loadingRows : [])
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
      // the server sorts the rows, the table only showing its order
      sortingMode="server"
      defaultOrder={{ by: SORT_COLUMN_IDS[sort.by], direction: sort.order }}
      onSortChange={({ order, orderBy }) =>
        onSortChange({
          by: orderBy === SORT_COLUMN_IDS.email ? 'email' : 'fn',
          order
        })
      }
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
