import {
  Button,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText
} from '@linagora/twake-mui'
import { Company, Contacts, Icon, Plus } from '@linagora/twake-icons'
import { useAppSelector } from '@common/app/hooks'
import { Link, useParams } from 'react-router-dom'
import { useI18n } from 'twake-i18n'

const MY_CONTACTS_ID = 'contacts'

export const ContactsSidebar: React.FC = () => {
  const { t } = useI18n()
  const { addressBookId } = useParams()
  const addressBooks = useAppSelector(state => state.contacts.addressBooks)
  const otherBooks = addressBooks.filter(
    book => book.id !== 'collected' && book.id !== MY_CONTACTS_ID
  )
  return (
    <List component="nav">
      <ListItem disableGutters>
        <Button variant="contained" fullWidth startIcon={<Icon icon={Plus} />}>
          {t('contacts.create')}
        </Button>
      </ListItem>
      <ListItem disableGutters disablePadding>
        <ListItemButton
          component={Link}
          to="/contacts"
          selected={addressBookId === undefined}
        >
          <ListItemIcon>
            <Icon icon={Contacts} />
          </ListItemIcon>
          <ListItemText primary={t('contacts.myContacts')} />
        </ListItemButton>
      </ListItem>
      {otherBooks.map(book => (
        <ListItem key={book.id} disableGutters disablePadding>
          <ListItemButton
            component={Link}
            to={`/contacts/${book.id}`}
            selected={addressBookId === book.id}
          >
            <ListItemIcon>
              <Icon icon={Company} />
            </ListItemIcon>
            <ListItemText primary={book.name} />
          </ListItemButton>
        </ListItem>
      ))}
    </List>
  )
}
