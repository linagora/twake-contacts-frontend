import { ContactEntry } from '@common/features/Contacts/contactsTypes'
import {
  Avatar,
  Chip,
  Stack,
  Typography,
  VirtualizedTableColumn,
  VirtualizedTableRow
} from '@linagora/twake-mui'
import React from 'react'
import { ContactRowActions } from './ContactRowActions'
import { getInitials } from './getInitials'

interface ContactCellProps {
  row?: VirtualizedTableRow
  column?: VirtualizedTableColumn
  cell?: unknown
  readOnly?: boolean
}

export const ContactCell: React.FC<ContactCellProps> = ({
  row,
  column,
  cell,
  readOnly
}) => {
  if (!row || !column) return null
  const { contact, addressBookId } = row as unknown as ContactEntry

  switch (column.id) {
    case 'contact.displayName':
      return (
        <Stack direction="row" spacing={2}>
          <Avatar size="s">{getInitials(contact.displayName)}</Avatar>
          <Typography>{contact.displayName}</Typography>
        </Stack>
      )
    case 'contact.categories':
      return (
        <Stack direction="row" spacing={1}>
          {contact.categories?.map(category => (
            <Chip key={category} label={category} size="small" square />
          ))}
        </Stack>
      )
    case 'actions':
      return (
        <ContactRowActions
          contact={contact}
          addressBookId={addressBookId}
          readOnly={readOnly}
        />
      )
    default:
      return <>{typeof cell === 'string' ? cell : '—'}</>
  }
}
