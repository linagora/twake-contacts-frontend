import {
  Avatar,
  Chip,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Stack,
  TableCell,
  TableRow
} from '@linagora/twake-mui'
import { Contact } from '@common/features/Contacts/contactsTypes'
import { useNavigate } from 'react-router-dom'
import { ContactActionsMenu } from './ContactActionsMenu'
import { getInitials } from './getInitials'

interface ContactRowProps {
  contact: Contact
  addressBookId: string
}

export const ContactRow: React.FC<ContactRowProps> = ({
  contact,
  addressBookId
}) => {
  const navigate = useNavigate()
  const handleClick = (): void => {
    navigate(`/contacts/${addressBookId}/${contact.id}`)
  }
  const handleMenuCellClick = (event: React.MouseEvent): void => {
    event.stopPropagation()
  }

  return (
    <TableRow hover onClick={handleClick}>
      <TableCell>
        <ListItem disableGutters disablePadding>
          <ListItemAvatar>
            <Avatar size="s">{getInitials(contact.displayName)}</Avatar>
          </ListItemAvatar>
          <ListItemText primary={contact.displayName} />
        </ListItem>
      </TableCell>
      <TableCell>{contact.emails[0]?.value ?? '-'}</TableCell>
      <TableCell>{contact.phones?.[0]?.value ?? '-'}</TableCell>
      <TableCell>
        <Stack direction="row" spacing={1}>
          {contact.categories?.map(category => (
            <Chip key={category} label={category} size="small" square />
          ))}
        </Stack>
      </TableCell>
      <TableCell align="right" onClick={handleMenuCellClick}>
        <ContactActionsMenu contact={contact} addressBookId={addressBookId} />
      </TableCell>
    </TableRow>
  )
}
