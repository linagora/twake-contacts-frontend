import {
  Button,
  ListItem,
  Nav,
  NavIcon,
  NavItem,
  NavLink,
  NavText,
  Sidebar
} from '@linagora/twake-mui'
import { Company, Contacts, Icon, Plus } from '@linagora/twake-icons'
import { useAppSelector } from '@common/app/hooks'
import { getAddressBookDisplayName } from '@common/features/Contacts/contactsUtils'
import { Link, useParams } from 'react-router-dom'
import { useI18n } from 'twake-i18n'

const MY_CONTACTS_ID = 'contacts'

export const ContactsSidebar: React.FC = () => {
  const { t } = useI18n()
  const { addressBookId } = useParams()
  const addressBooks = useAppSelector(state => state.contacts.addressBooks)
  const otherBooks = Object.values(addressBooks).filter(
    book => book.id !== 'collected' && book.id !== MY_CONTACTS_ID
  )

  return (
    <Sidebar>
      <Nav>
        <ListItem>
          <Button
            variant="contained"
            fullWidth
            startIcon={<Icon icon={Plus} />}
            component={Link}
            to="/contacts/new"
          >
            {t('contacts.create')}
          </Button>
        </ListItem>
        <NavItem>
          <NavLink
            component={Link}
            to="/contacts"
            selected={addressBookId === undefined}
          >
            <NavIcon icon={Contacts} />
            <NavText>{t('contacts.myContacts')}</NavText>
          </NavLink>
        </NavItem>
        {otherBooks.map(book => (
          <NavItem key={book.id}>
            <NavLink
              component={Link}
              to={`/contacts/${book.id}`}
              selected={addressBookId === book.id}
            >
              <NavIcon icon={Company} />
              <NavText>{getAddressBookDisplayName(book, t)}</NavText>
            </NavLink>
          </NavItem>
        ))}
      </Nav>
    </Sidebar>
  )
}
