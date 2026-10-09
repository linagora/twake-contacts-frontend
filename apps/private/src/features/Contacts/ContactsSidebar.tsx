import { useState } from 'react'
import { useAppSelector } from '@common/app/hooks'
import {
  getAddressBookDisplayName,
  isHiddenAddressBook,
  sortAddressBooks
} from '@common/features/Contacts/contactsUtils'
import {
  Company,
  Icon,
  Plus,
  ContactList,
  Dots,
  ShareExternal,
  Peoples
} from '@linagora/twake-icons'
import {
  Box,
  Nav,
  NavIcon,
  NavItem,
  NavLink,
  NavText,
  Sidebar,
  Button,
  Tooltip,
  NavDropdown,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText
} from '@linagora/twake-mui'
import { Link, useNavigate, useParams } from 'react-router'
import { useI18n } from 'twake-i18n'
import {
  AddressBook,
  AddressBookWithContacts
} from '@common/features/Contacts/contactsTypes'
import { ShareAddressBookDialog } from './ShareAddressBook/ShareAddressBookDialog'

interface ContactsSidebarProps {
  onOpenCreateBook: () => void
}

const CreateAddressBookButton: React.FC<{ onClick: () => void }> = ({
  onClick
}) => {
  const { t } = useI18n()
  return (
    <Tooltip title={t('contacts.addressBook.createTitle')}>
      <IconButton
        size="xsmall"
        aria-label={t('contacts.addressBook.createTitle')}
        onClick={e => {
          e.stopPropagation()
          onClick()
        }}
      >
        <Icon icon={Plus} size={14} />
      </IconButton>
    </Tooltip>
  )
}

export const ContactsSidebar: React.FC<ContactsSidebarProps> = ({
  onOpenCreateBook
}) => {
  const [isMyContactsExpanded, setIsMyContactsExpanded] = useState(true)
  const { t } = useI18n()
  const { addressBookId } = useParams()
  const navigate = useNavigate()
  const addressBooks = useAppSelector(state => state.contacts.addressBooks)
  const currentBook = addressBookId ? addressBooks[addressBookId] : undefined
  const canWriteCurrentBook =
    (currentBook?.canWrite && addressBookId !== 'dab') ?? false
  const otherBooks = sortAddressBooks(
    Object.values(addressBooks).filter(
      (book: AddressBookWithContacts) =>
        !isHiddenAddressBook(book.id) && book.id !== 'dab'
    ) as AddressBook[],
    t
  )

  const domainBooks = Object.values(addressBooks).filter(
    (book: AddressBookWithContacts) => book.id === 'dab'
  ) as AddressBook[]

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
          <NavItem
            secondaryAction={
              <CreateAddressBookButton onClick={onOpenCreateBook} />
            }
          >
            {otherBooks.length === 0 ? (
              <NavLink
                selected={addressBookId === undefined}
                onClick={() => {
                  void navigate('/contacts')
                }}
              >
                <NavIcon icon={ContactList} />
                <NavText>{t('contacts.myContacts')}</NavText>
              </NavLink>
            ) : (
              <NavDropdown
                open={isMyContactsExpanded}
                onToggle={() => setIsMyContactsExpanded(!isMyContactsExpanded)}
                selected={addressBookId === undefined}
                onClick={() => {
                  void navigate('/contacts')
                }}
              >
                <NavIcon icon={ContactList} />
                <NavText>{t('contacts.myContacts')}</NavText>
              </NavDropdown>
            )}
          </NavItem>

          {isMyContactsExpanded &&
            otherBooks.map(book => (
              <AddressBookNavItem
                key={book.id}
                book={book}
                selected={addressBookId === book.id}
              />
            ))}

          {domainBooks.map(book => (
            <NavItem key={book.id}>
              <NavLink
                onClick={() => {
                  void navigate(`/contacts/${book.id}`)
                }}
                selected={addressBookId === book.id}
              >
                <NavIcon icon={Company} />
                <NavText>
                  <span className="u-ellipsis">
                    {getAddressBookDisplayName(book, t)}
                  </span>
                </NavText>
              </NavLink>
            </NavItem>
          ))}
        </Nav>
      </Box>
    </Sidebar>
  )
}

const AddressBookNavItem: React.FC<{
  book: AddressBook
  selected: boolean
}> = ({ book, selected }) => {
  const { t } = useI18n()
  const navigate = useNavigate()
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false)

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>): void => {
    event.stopPropagation()
    event.preventDefault()
    setAnchorEl(event.currentTarget)
  }

  const handleMenuClose = (): void => {
    setAnchorEl(null)
  }

  const handleShare = (event: React.MouseEvent): void => {
    event.stopPropagation()
    event.preventDefault()
    setIsShareDialogOpen(true)
    handleMenuClose()
  }

  const isMenuOpen = Boolean(anchorEl)
  const [isHovered, setIsHovered] = useState(false)

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <NavItem
        key={book.id}
        variant="secondary"
        secondaryAction={
          (isHovered || isMenuOpen) && book.canWrite ? (
            <>
              <Tooltip title={t('contacts.menu.more')}>
                <IconButton size="xsmall" onClick={handleMenuOpen}>
                  <Icon icon={Dots} size={10} rotate={90} />
                </IconButton>
              </Tooltip>
              <Menu
                anchorEl={anchorEl}
                open={isMenuOpen}
                onClose={handleMenuClose}
                onClick={e => e.stopPropagation()}
              >
                <MenuItem onClick={handleShare}>
                  <ListItemIcon>
                    <Icon icon={ShareExternal} />
                  </ListItemIcon>
                  <ListItemText>{t('contacts.menu.share')}</ListItemText>
                </MenuItem>
              </Menu>
            </>
          ) : null
        }
      >
        <NavLink
          onClick={() => {
            void navigate(`/contacts/${book.id}`)
          }}
          selected={selected}
        >
          <NavIcon icon={Peoples} />
          <Tooltip title={getAddressBookDisplayName(book, t)}>
            <NavText className="u-mr-1" secondaryText={book.ownerDisplayName}>
              <Box className="u-ellipsis">
                {getAddressBookDisplayName(book, t)}
              </Box>
            </NavText>
          </Tooltip>
        </NavLink>
      </NavItem>
      {isShareDialogOpen && (
        <ShareAddressBookDialog
          addressBookId={book.id}
          onClose={() => setIsShareDialogOpen(false)}
        />
      )}
    </div>
  )
}
