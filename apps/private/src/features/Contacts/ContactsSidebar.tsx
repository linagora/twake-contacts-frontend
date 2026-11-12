import { addressBookPath } from './contactPath'
import React, { useId, useState } from 'react'
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
  useBreakpoints,
  Skeleton
} from '@linagora/twake-mui'
import { Link, useNavigate, useParams } from 'react-router'
import { useI18n } from 'twake-i18n'
import { AddressBookNavItem } from './ContactsSidebar/AddressBookNavItem'
import { MyContactsNavItem } from './ContactsSidebar/MyContactsNavItem'
import { NestedNavList } from './ContactsSidebar/NestedNavList'
import { SharedSectionHeader } from './ContactsSidebar/SharedSectionHeader'
import {
  categorizeAddressBooks,
  getAriaCurrent,
  getCreateContactLink
} from './ContactsSidebar/sidebarHelpers'

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
  const myBooksListId = useId()
  const sharedBooksListId = useId()
  const { t } = useI18n()
  const { addressBookId } = useParams()
  const navigate = useNavigate()
  const { isMobile } = useBreakpoints()

  const addressBooks = useAppSelector(state => state.contacts.addressBooks)
  const isLoading = useAppSelector(state => state.contacts.loading)
  const currentBook = addressBookId ? addressBooks[addressBookId] : undefined
  const createLink = getCreateContactLink(addressBookId, currentBook, isLoading)
  const { personalBooks, sharedBooks, domainBooks } = categorizeAddressBooks(
    addressBooks,
    t
  )
  const hasPersonalBooks = isLoading || personalBooks.length > 0
  const hasSharedBooks = isLoading || sharedBooks.length > 0

  const handleItemClick = (path: string): void => {
    void navigate(path)
    if (isMobile) {
      onClose?.()
    }
  }

  const renderSkeletons = (
    variant: 'primary' | 'secondary',
    width: number,
    height: number
  ): React.ReactNode =>
    Array.from({ length: 3 }, (_, index) => (
      <NavItem key={index} variant={variant}>
        <Skeleton variant="text" width={width} height={height} />
      </NavItem>
    ))

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
            hasBooks={hasPersonalBooks}
            isExpanded={isMyContactsExpanded}
            isSelected={addressBookId === undefined}
            booksListId={myBooksListId}
            onToggle={() => setIsMyContactsExpanded(!isMyContactsExpanded)}
            onNavigate={() => {
              setIsMyContactsExpanded(true)
              void navigate('/contacts')
            }}
            onOpenCreateBook={() => {
              onOpenCreateBook()
              if (isMobile) {
                onClose?.()
              }
            }}
          />

          {hasPersonalBooks && (
            <NestedNavList id={myBooksListId}>
              {isMyContactsExpanded &&
                (isLoading
                  ? renderSkeletons('secondary', 170, 40)
                  : personalBooks.map(book => (
                      <AddressBookNavItem
                        key={book.id}
                        book={book}
                        variant="secondary"
                        selected={addressBookId === book.id}
                        onNavigate={handleItemClick}
                      />
                    )))}
            </NestedNavList>
          )}

          {domainBooks.map(book => (
            <NavItem key={book.id}>
              <NavLink
                onClick={() => handleItemClick(addressBookPath(book.id))}
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

          <SharedSectionHeader
            isFoldable={hasSharedBooks}
            isExpanded={isSharedExpanded}
            booksListId={sharedBooksListId}
            onToggle={() => setIsSharedExpanded(!isSharedExpanded)}
            onOpenSubscribe={onOpenSubscribe}
          />

          {hasSharedBooks && (
            <NestedNavList id={sharedBooksListId}>
              {isSharedExpanded &&
                (isLoading
                  ? renderSkeletons('primary', 200, 45)
                  : sharedBooks.map(book => (
                      <AddressBookNavItem
                        key={book.id}
                        book={book}
                        variant="primary"
                        selected={addressBookId === book.id}
                        onNavigate={handleItemClick}
                      />
                    )))}
            </NestedNavList>
          )}
        </Nav>
      </Box>
    </Sidebar>
  )
}
