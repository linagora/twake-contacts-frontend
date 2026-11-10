import React, { useState } from 'react'
import { AddressBook } from '@common/features/Contacts/contactsTypes'
import { getAddressBookDisplayName } from '@common/features/Contacts/contactsUtils'
import { Dots, Icon, Peoples } from '@linagora/twake-icons'
import {
  Box,
  IconButton,
  NavIcon,
  NavItem,
  NavLink,
  NavText,
  Tooltip,
  useBreakpoints
} from '@linagora/twake-mui'
import { useNavigate } from 'react-router'
import { useI18n } from 'twake-i18n'
import { getAriaCurrent } from './sidebarHelpers'
import { useAddressBookActions } from '../AddressBookActions/useAddressBookActions'

export interface AddressBookNavItemProps {
  book: AddressBook
  selected: boolean
  variant: 'primary' | 'secondary' | 'tertiary' | undefined
  onNavigate: (path: string) => void
}

export const AddressBookNavItem: React.FC<AddressBookNavItemProps> = ({
  book,
  selected,
  variant,
  onNavigate
}) => {
  const { t } = useI18n()
  const navigate = useNavigate()
  const { isMobile } = useBreakpoints()
  const [isHovered, setIsHovered] = useState(false)
  const { isMenuOpen, openMenu, menu, dialogs } = useAddressBookActions({
    book,
    onRemoved: () => {
      if (selected) void navigate('/contacts')
    }
  })

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
                  onClick={openMenu}
                  onBlur={() => setIsHovered(false)}
                >
                  <Icon icon={Dots} size={10} rotate={90} />
                </IconButton>
              </Tooltip>
              {menu}
            </>
          ) : null
        }
      >
        <NavLink
          onClick={() => onNavigate(`/contacts/${book.id}`)}
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
      {dialogs}
    </div>
  )
}
