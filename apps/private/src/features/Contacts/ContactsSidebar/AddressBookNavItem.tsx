import React, { useState } from 'react'
import { AddressBook } from '@common/features/Contacts/contactsTypes'
import {
  canShareAddressBook,
  getAddressBookDisplayName
} from '@common/features/Contacts/contactsUtils'
import {
  Trash,
  Dots,
  Icon,
  Peoples,
  Pen,
  ShareExternal
} from '@linagora/twake-icons'
import {
  ActionsMenu,
  ActionsMenuItem,
  Box,
  IconButton,
  ListItemIcon,
  ListItemText,
  NavIcon,
  NavItem,
  NavLink,
  NavText,
  Tooltip,
  useBreakpoints
} from '@linagora/twake-mui'
import { useNavigate } from 'react-router'
import { useI18n } from 'twake-i18n'
import { ShareAddressBookDialog } from '../ShareAddressBook/ShareAddressBookDialog'
import { getAriaCurrent } from './sidebarHelpers'
import { useAppDispatch } from '@common/app/hooks'
import {
  deleteAddressBook,
  updateAddressBook
} from '@common/features/Contacts/ContactsSlice'
import { DeleteAddressBookDialog } from '../DeleteAddressBookDialog'
import { EditAddressBookDialog } from '../EditAddressBookDialog'

export interface AddressBookNavItemProps {
  book: AddressBook
  selected: boolean
  variant: 'primary' | 'secondary' | 'tertiary' | undefined
}

export const AddressBookNavItem: React.FC<AddressBookNavItemProps> = ({
  book,
  selected,
  variant
}) => {
  const { t } = useI18n()
  const navigate = useNavigate()
  const { isMobile } = useBreakpoints()
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)

  const dispatch = useAppDispatch()
  const isCopy = Boolean(book.ownerId)

  const removeBook = (): void => {
    void dispatch(
      deleteAddressBook({ userId: book.userId, addressBookId: book.id })
    )
      .unwrap()
      .then(() => {
        if (selected) void navigate('/contacts')
        return
      })
      .catch(() => {})
  }

  const handleDelete = (): void => {
    handleMenuClose()
    setIsConfirmOpen(true)
  }

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>): void => {
    event.stopPropagation()
    event.preventDefault()
    setAnchorEl(event.currentTarget)
  }

  const handleMenuClose = (): void => {
    setAnchorEl(null)
  }

  const handleEdit = (): void => {
    handleMenuClose()
    setIsEditOpen(true)
  }

  const handleShare = (): void => {
    setIsShareDialogOpen(true)
    handleMenuClose()
  }

  const isMenuOpen = Boolean(anchorEl)

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setIsHovered(true)}
    >
      <NavItem
        key={book.id}
        variant={variant}
        secondaryAction={
          isHovered || isMenuOpen || isMobile ? (
            <>
              <Tooltip disableInteractive title={t('contacts.menu.more')}>
                <IconButton
                  size="xsmall"
                  onClick={handleMenuOpen}
                  onBlur={() => setIsHovered(false)}
                >
                  <Icon icon={Dots} size={10} rotate={90} />
                </IconButton>
              </Tooltip>
              <ActionsMenu
                ref={{ current: anchorEl }}
                open={isMenuOpen}
                onClose={handleMenuClose}
                onClick={e => e.stopPropagation()}
              >
                {canShareAddressBook(book) && (
                  <ActionsMenuItem onClick={handleShare}>
                    <ListItemIcon>
                      <Icon icon={ShareExternal} />
                    </ListItemIcon>
                    <ListItemText>{t('contacts.menu.share')}</ListItemText>
                  </ActionsMenuItem>
                )}
                {book.canWrite && !isCopy && (
                  <ActionsMenuItem onClick={handleEdit}>
                    <ListItemIcon>
                      <Icon icon={Pen} />
                    </ListItemIcon>
                    <ListItemText>{t('contacts.menu.edit')}</ListItemText>
                  </ActionsMenuItem>
                )}
                <ActionsMenuItem onClick={handleDelete}>
                  <ListItemIcon>
                    <Icon icon={Trash} />
                  </ListItemIcon>
                  <ListItemText>
                    {t(
                      isCopy ? 'contacts.menu.remove' : 'contacts.menu.delete'
                    )}
                  </ListItemText>
                </ActionsMenuItem>
              </ActionsMenu>
            </>
          ) : null
        }
      >
        <NavLink
          onClick={() => {
            void navigate(`/contacts/${book.id}`)
          }}
          selected={selected}
          aria-current={getAriaCurrent(selected)}
        >
          <NavIcon icon={Peoples} />
          <Tooltip
            disableInteractive
            title={getAddressBookDisplayName(book, t)}
          >
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
      {isConfirmOpen && (
        <DeleteAddressBookDialog
          book={book}
          onClose={() => setIsConfirmOpen(false)}
          onConfirm={() => {
            setIsConfirmOpen(false)
            removeBook()
          }}
        />
      )}
      {isEditOpen && (
        <EditAddressBookDialog
          book={book}
          onClose={() => setIsEditOpen(false)}
          onConfirm={({ name }) => {
            setIsEditOpen(false)
            void dispatch(
              updateAddressBook({
                userId: book.userId,
                addressBookId: book.id,
                name
              })
            )
          }}
        />
      )}
    </div>
  )
}
