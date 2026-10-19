import React, { useState } from 'react'
import { useAppSelector } from '@common/app/hooks'
import { getAddressBookDisplayName } from '@common/features/Contacts/contactsUtils'
import { Company, Icon, Plus } from '@linagora/twake-icons'
import {
  Box,
  Nav,
  NavIcon,
  NavItem,
  NavLink,
  NavText,
  Sidebar,
  Button,
  DropdownButton,
  DropdownText,
  ListItem,
  useBreakpoints
} from '@linagora/twake-mui'
import { Link, useMatch, useNavigate, useParams } from 'react-router'
import { useI18n } from 'twake-i18n'
import { AddressBookNavItem } from './ContactsSidebar/AddressBookNavItem'
import { MyContactsNavItem } from './ContactsSidebar/MyContactsNavItem'
import {
  categorizeAddressBooks,
  getAriaCurrent,
  getCreateContactLink
} from './ContactsSidebar/sidebarHelpers'
import { CreateAddressBookButton } from './ContactsSidebar/CreateAddressBookButton'

export interface ContactsSidebarProps {
  onOpenCreateBook: () => void
  onOpenSubscribe: () => void
  open?: boolean
  onClose?: () => void
}

export const ContactsSidebar: React.FC<ContactsSidebarProps> = ({
  onOpenCreateBook,
  onOpenSubscribe,
  open = true,
  onClose
}) => {
  const [isMyContactsExpanded, setIsMyContactsExpanded] = useState(true)
  const [isSharedExpanded, setIsSharedExpanded] = useState(true)
  const { t } = useI18n()
  const { addressBookId } = useParams()
  const navigate = useNavigate()
  const isOnMyContacts = useMatch('/contacts') !== null
  const openpaasId = useAppSelector(state => state.user.userData.openpaasId)
  const { isMobile } = useBreakpoints()

  const addressBooks = useAppSelector(state => state.contacts.addressBooks)
  const loading = useAppSelector(state => state.contacts.loading)
  const currentBook = addressBookId ? addressBooks[addressBookId] : undefined
  const createLink = getCreateContactLink(addressBookId, currentBook, loading)
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
                aria-current={getAriaCurrent(addressBookId === book.id)}
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
          {/* Not NavDesktopDropdown: its caption toggle is a click-only div,
              unreachable with the keyboard and without aria-expanded */}
          <ListItem
            size="small"
            secondaryAction={
              <CreateAddressBookButton
                onClick={onOpenSubscribe}
                label={t('contacts.addressBook.subscribeTitle')}
              />
            }
          >
            {sharedBooks.length > 0 ? (
              <DropdownButton
                fullWidth
                spaceBetween
                textVariant="caption"
                aria-expanded={isSharedExpanded}
                onClick={() => setIsSharedExpanded(!isSharedExpanded)}
                dropdownTextProps={{
                  color: 'textSecondary',
                  innerIconProps: { rotate: isSharedExpanded ? 0 : -90 }
                }}
              >
                {t('contacts.shared')}
              </DropdownButton>
            ) : (
              <DropdownText
                variant="caption"
                color="textSecondary"
                innerIconProps={{ display: 'none' }}
              >
                {t('contacts.shared')}
              </DropdownText>
            )}
          </ListItem>
          {isSharedExpanded &&
            sharedBooks.map(book => (
              <AddressBookNavItem
                key={book.id}
                book={book}
                variant="primary"
                selected={addressBookId === book.id}
              />
            ))}
        </Nav>
      </Box>
    </Sidebar>
  )
}
