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
  NavDesktopDropdown,
  Stack,
  useBreakpoints,
  Skeleton
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
  const { t } = useI18n()
  const { addressBookId } = useParams()
  const navigate = useNavigate()
  const isOnMyContacts = useMatch('/contacts') !== null
  const openpaasId = useAppSelector(state => state.user.userData.openpaasId)
  const { isMobile, isTablet } = useBreakpoints()

  const addressBooks = useAppSelector(state => state.contacts.addressBooks)
  const isLoading = useAppSelector(state => state.contacts.loading)
  const currentBook = addressBookId ? addressBooks[addressBookId] : undefined
  const createLink = getCreateContactLink(addressBookId, currentBook, isLoading)
  const { personalBooks, sharedBooks, domainBooks } = categorizeAddressBooks(
    addressBooks,
    openpaasId,
    t
  )

  const handleItemClick = (path: string): void => {
    void navigate(path)
    if (isMobile || isTablet) {
      onClose?.()
    }
  }
  return (
    <Sidebar anchor="left" open={open} onClose={onClose}>
      {!(isMobile || isTablet) && (
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
            hasBooks={isLoading || personalBooks.length > 0}
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
              if (isMobile || isTablet) {
                onClose?.()
              }
            }}
          />

          {isMyContactsExpanded &&
            isLoading &&
            Array.from({ length: 3 }, (_, index) => (
              <NavItem key={index} variant="secondary">
                <Skeleton variant="text" width={170} height={40} />
              </NavItem>
            ))}

          {isMyContactsExpanded &&
            !isLoading &&
            personalBooks.map(book => (
              <AddressBookNavItem
                key={book.id}
                book={book}
                variant="secondary"
                selected={addressBookId === book.id}
                onNavigate={handleItemClick}
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
          <NavDesktopDropdown
            label={
              <Stack
                direction="row"
                className="u-flex-justify-between u-flex-items-center"
              >
                <span>{t('contacts.shared')}</span>
                <CreateAddressBookButton
                  onClick={onOpenSubscribe}
                  label={t('contacts.addressBook.subscribeTitle')}
                />
              </Stack>
            }
            limit={0}
          >
            {isLoading
              ? Array.from({ length: 3 }, (_, index) => (
                  <NavItem key={index} variant="primary">
                    <Skeleton variant="text" width={200} height={45} />
                  </NavItem>
                ))
              : sharedBooks.map(book => (
                  <AddressBookNavItem
                    key={book.id}
                    book={book}
                    variant="primary"
                    selected={addressBookId === book.id}
                    onNavigate={handleItemClick}
                  />
                ))}
          </NavDesktopDropdown>
        </Nav>
      </Box>
    </Sidebar>
  )
}
