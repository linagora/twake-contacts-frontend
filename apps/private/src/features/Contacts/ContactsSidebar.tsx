import React, { useState } from 'react'
import { useAppSelector } from '@common/app/hooks'
import { getAddressBookDisplayName } from '@common/features/Contacts/contactsUtils'
import { Company, Icon, Plus } from '@linagora/twake-icons'
import {
  Box,
  Button,
  Nav,
  NavDesktopDropdown,
  NavIcon,
  NavItem,
  NavLink,
  NavText,
  Sidebar,
  useBreakpoints
} from '@linagora/twake-mui'
import { Link, useMatch, useNavigate, useParams } from 'react-router'
import { useI18n } from 'twake-i18n'
import { AddressBookNavItem } from './ContactsSidebar/AddressBookNavItem'
import { MyContactsNavItem } from './ContactsSidebar/MyContactsNavItem'
import {
  categorizeAddressBooks,
  getCreateContactLink
} from './ContactsSidebar/sidebarHelpers'

export interface ContactsSidebarProps {
  onOpenCreateBook: () => void
  open?: boolean
  onClose?: () => void
}

export const ContactsSidebar: React.FC<ContactsSidebarProps> = ({
  onOpenCreateBook,
  open = true,
  onClose
}) => {
  const [isMyContactsExpanded, setIsMyContactsExpanded] = useState(true)
  const { t } = useI18n()
  const { addressBookId } = useParams()
  const navigate = useNavigate()
  const isOnMyContacts = useMatch('/contacts') !== null
  const openpaasId = useAppSelector(state => state.user.userData.openpaasId)
  const { isMobile } = useBreakpoints()

  const addressBooks = useAppSelector(state => state.contacts.addressBooks)
  const currentBook = addressBookId ? addressBooks[addressBookId] : undefined
  const createLink = getCreateContactLink(addressBookId, currentBook)
  const { personalBooks, sharedBooks, domainBooks } = categorizeAddressBooks(
    addressBooks,
    openpaasId,
    t
  )

  const handleItemClick = (path: string): void => {
    void navigate(path)
    if (isMobile) {
      onClose?.()
    }
  }

  return (
    <Sidebar anchor="left" open={open} onClose={onClose}>
      {!isMobile && (
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
      )}
      <Box className="u-flex-auto u-ov-auto u-mt-1-half">
        <Nav className="u-mv-0">
          <MyContactsNavItem
            hasBooks={personalBooks.length > 0}
            isExpanded={isMyContactsExpanded}
            isSelected={addressBookId === undefined}
            onToggle={() => setIsMyContactsExpanded(!isMyContactsExpanded)}
            onNavigate={() => {
              // NavDropdown has a single click target: toggle when already
              // on /contacts, otherwise navigate there with books shown
              if (isOnMyContacts) {
                setIsMyContactsExpanded(!isMyContactsExpanded)
              } else {
                setIsMyContactsExpanded(true)
                void navigate('/contacts')
              }
            }}
            onOpenCreateBook={() => {
              onOpenCreateBook()
              if (isMobile) {
                onClose?.()
              }
            }}
          />

          {isMyContactsExpanded &&
            personalBooks.map(book => (
              <AddressBookNavItem
                key={book.id}
                book={book}
                variant="secondary"
                selected={addressBookId === book.id}
              />
            ))}

          {domainBooks.map(book => (
            <NavItem key={book.id}>
              <NavLink
                onClick={() => handleItemClick(`/contacts/${book.id}`)}
                selected={addressBookId === book.id}
              >
                <NavIcon icon={Company} />
                <NavText>
                  <span className="u-ellipsis u-db">
                    {getAddressBookDisplayName(book, t)}
                  </span>
                </NavText>
              </NavLink>
            </NavItem>
          ))}
          <NavDesktopDropdown label={t('contacts.shared')} limit={0}>
            {sharedBooks.map(book => (
              <AddressBookNavItem
                key={book.id}
                book={book}
                variant="primary"
                selected={addressBookId === book.id}
              />
            ))}
          </NavDesktopDropdown>
        </Nav>
      </Box>
    </Sidebar>
  )
}
