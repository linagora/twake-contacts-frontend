import {
  Button,
  Box,
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
      <Box className="u-mh-1 u-mt-1">
        <Button
          variant="contained"
          fullWidth
          startIcon={<Icon size={12} icon={Plus} />}
          component={Link}
          to="/contacts/new"
          className="u-bdrs-6 u-fz-small"
        >
          {t('contacts.create')}
        </Button>
      </Box>
      <Nav>
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
