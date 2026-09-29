import { useAppSelector } from '@common/app/hooks'
import {
  getAddressBookDisplayName,
  isHiddenAddressBook
} from '@common/features/Contacts/contactsUtils'
import { Company, Contacts, Icon, Plus } from '@linagora/twake-icons'
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
import { Link, useParams } from 'react-router'
import { useI18n } from 'twake-i18n'

export const ContactsSidebar: React.FC = () => {
  const { t } = useI18n()
  const { addressBookId } = useParams()
  const addressBooks = useAppSelector(state => state.contacts.addressBooks)
  const currentBook = addressBookId ? addressBooks[addressBookId] : undefined
  const canWriteCurrentBook =
    (currentBook?.canWrite && addressBookId !== 'dab') ?? false
  const otherBooks = Object.values(addressBooks)
    .filter(book => !isHiddenAddressBook(book.id))
    .sort((a, b) =>
      getAddressBookDisplayName(a, t).localeCompare(
        getAddressBookDisplayName(b, t),
        undefined,
        { numeric: true }
      )
    )

  const createLink =
    addressBookId && canWriteCurrentBook
      ? `/contacts/${addressBookId}/new`
      : '/contacts/new'

  return (
    <Sidebar>
      <Box className="u-mh-1 u-mt-1">
        <Button
          variant="contained"
          fullWidth
          startIcon={<Icon size={12} icon={Plus} />}
          component={Link}
          to={createLink}
          className="u-bdrs-6 u-fz-small"
        >
          {t('contacts.create')}
        </Button>
      </Box>
      <Box className="u-flex-auto u-ov-auto u-mt-1-half">
        <Nav className="u-mv-0">
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
      </Box>
    </Sidebar>
  )
}
