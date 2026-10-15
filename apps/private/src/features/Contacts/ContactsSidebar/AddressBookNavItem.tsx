import React, { useState } from 'react'
import { AddressBook } from '@common/features/Contacts/contactsTypes'
import { getAddressBookDisplayName } from '@common/features/Contacts/contactsUtils'
import { Dots, Icon, Peoples, ShareExternal } from '@linagora/twake-icons'
import {
  Box,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  NavIcon,
  NavItem,
  NavLink,
  NavText,
  Tooltip
} from '@linagora/twake-mui'
import { useNavigate } from 'react-router'
import { useI18n } from 'twake-i18n'
import { ShareAddressBookDialog } from '../ShareAddressBook/ShareAddressBookDialog'

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
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

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

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <NavItem
        key={book.id}
        variant={variant}
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
