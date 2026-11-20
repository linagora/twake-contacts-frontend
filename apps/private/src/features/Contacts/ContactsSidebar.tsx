import { addressBookPath, useContactRouteParams } from './contactPath'
import React, { useId, useState } from 'react'
import { useAppSelector } from '@common/app/hooks'
import { AddressBook } from '@common/features/Contacts/contactsTypes'
import { getAddressBookDisplayName } from '@common/features/Contacts/contactsUtils'
import { Company, Icon, Peoples, Plus } from '@linagora/twake-icons'
import {
  Box,
  ListItem,
  Nav,
  NavIcon,
  NavItem,
  NavLink,
  NavText,
  Sidebar,
  Button,
  useBreakpoints,
  Skeleton,
  Typography
} from '@linagora/twake-mui'
import { Link, useMatch, useNavigate } from 'react-router'
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

const SKELETON_DIMENSIONS = {
  primary: { width: 200, height: 45 },
  secondary: { width: 170, height: 40 }
} as const

interface SidebarBookListProps {
  id: string
  books: AddressBook[]
  variant: 'primary' | 'secondary'
  isExpanded: boolean
  isLoading: boolean
  selectedBookId?: string
  onNavigate: (path: string) => void
}

const SidebarBookList: React.FC<SidebarBookListProps> = ({
  id,
  books,
  variant,
  isExpanded,
  isLoading,
  selectedBookId,
  onNavigate
}) => {
  if (!isLoading && books.length === 0) return null
  const { width, height } = SKELETON_DIMENSIONS[variant]

  return (
    <NestedNavList id={id}>
      {isExpanded &&
        (isLoading
          ? Array.from({ length: 3 }, (_, index) => (
              <NavItem key={index} variant={variant}>
                <Skeleton variant="text" width={width} height={height} />
              </NavItem>
            ))
          : books.map(book => (
              <AddressBookNavItem
                key={book.id}
                book={book}
                variant={variant}
                selected={selectedBookId === book.id}
                onNavigate={onNavigate}
              />
            )))}
    </NestedNavList>
  )
}

interface DomainBooksListProps {
  books: AddressBook[]
  selectedBookId?: string
  onNavigate: (path: string) => void
}

const DomainBooksList: React.FC<DomainBooksListProps> = ({
  books,
  selectedBookId,
  onNavigate
}) => {
  const { t } = useI18n()

  return (
    <>
      {books.map(book => (
        <NavItem key={book.id}>
          <NavLink
            onClick={() => onNavigate(addressBookPath(book.id))}
            selected={selectedBookId === book.id}
            aria-current={getAriaCurrent(selectedBookId === book.id)}
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
    </>
  )
}

interface MergeNavSectionProps {
  isSelected: boolean
  onNavigate: () => void
}

const MergeNavSection: React.FC<MergeNavSectionProps> = ({
  isSelected,
  onNavigate
}) => {
  const { t } = useI18n()

  return (
    <>
      <ListItem size="small">
        <Typography variant="caption" color="textSecondary">
          {t('contacts.merge.sectionTitle')}
        </Typography>
      </ListItem>
      <NavItem>
        <NavLink
          onClick={onNavigate}
          selected={isSelected}
          aria-current={getAriaCurrent(isSelected)}
        >
          <NavIcon icon={Peoples} />
          <NavText>{t('contacts.merge.navLabel')}</NavText>
        </NavLink>
      </NavItem>
    </>
  )
}

const CreateContactSidebarButton: React.FC<{ to: string }> = ({ to }) => {
  const { t } = useI18n()

  return (
    <Box className="u-mh-1 u-mt-1">
      <Button
        variant="contained"
        fullWidth
        startIcon={<Icon size={12} icon={Plus} />}
        component={Link}
        to={to}
        className="u-bdrs-6 u-fz-small"
      >
        {t('contacts.create')}
      </Button>
    </Box>
  )
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
  const { addressBookId } = useContactRouteParams()
  const isMergeSelected = !!useMatch('/contacts/merge')
  const navigate = useNavigate()
  const { isMobile, isTablet, isDesktop, isExtraLarge } = useBreakpoints()

  const addressBooks = useAppSelector(state => state.contacts.addressBooks)
  const isLoading = useAppSelector(state => state.contacts.loading)
  const currentBook = addressBookId ? addressBooks[addressBookId] : undefined
  const createLink = getCreateContactLink(addressBookId, currentBook, isLoading)
  const { personalBooks, sharedBooks, domainBooks } = categorizeAddressBooks(
    addressBooks,
    t
  )
  const isCompactViewport = isMobile || isTablet

  const closeOnCompactViewport = (): void => {
    if (isCompactViewport) onClose?.()
  }

  const handleItemClick = (path: string): void => {
    void navigate(path)
    closeOnCompactViewport()
  }

  return (
    <Sidebar anchor="left" open={open} onClose={onClose}>
      {(isDesktop || isExtraLarge) && (
        <CreateContactSidebarButton to={createLink} />
      )}
      <Box className="u-flex-auto u-ov-auto u-mt-1-half">
        <Nav className="u-mv-0">
          <MyContactsNavItem
            hasBooks={isLoading || personalBooks.length > 0}
            isExpanded={isMyContactsExpanded}
            isSelected={addressBookId === undefined && !isMergeSelected}
            booksListId={myBooksListId}
            onToggle={() => setIsMyContactsExpanded(!isMyContactsExpanded)}
            onNavigate={() => {
              setIsMyContactsExpanded(true)
              handleItemClick('/contacts')
            }}
            onOpenCreateBook={() => {
              onOpenCreateBook()
              closeOnCompactViewport()
            }}
          />

          <SidebarBookList
            id={myBooksListId}
            books={personalBooks}
            variant="secondary"
            isExpanded={isMyContactsExpanded}
            isLoading={isLoading}
            selectedBookId={addressBookId}
            onNavigate={handleItemClick}
          />

          <DomainBooksList
            books={domainBooks}
            selectedBookId={addressBookId}
            onNavigate={handleItemClick}
          />

          <SharedSectionHeader
            isFoldable={isLoading || sharedBooks.length > 0}
            isExpanded={isSharedExpanded}
            booksListId={sharedBooksListId}
            onToggle={() => setIsSharedExpanded(!isSharedExpanded)}
            onOpenSubscribe={onOpenSubscribe}
          />

          <SidebarBookList
            id={sharedBooksListId}
            books={sharedBooks}
            variant="primary"
            isExpanded={isSharedExpanded}
            isLoading={isLoading}
            selectedBookId={addressBookId}
            onNavigate={handleItemClick}
          />

          <MergeNavSection
            isSelected={isMergeSelected}
            onNavigate={() => handleItemClick('/contacts/merge')}
          />
        </Nav>
      </Box>
    </Sidebar>
  )
}
