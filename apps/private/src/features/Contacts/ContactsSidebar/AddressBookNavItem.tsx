import { addressBookPath } from '../contactPath'
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
import { FOCUS_HEADING_STATE } from '../focusHeadingOnArrival'
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
  const [entry, setEntry] = useState<HTMLLIElement | null>(null)
  const { isMenuOpen, openMenu, menu, dialogs } = useAddressBookActions({
    book,
    onRemoved: () => {
      if (selected) void navigate('/contacts', { state: FOCUS_HEADING_STATE })
    }
  })

  return (
    <>
      <NavItem
        ref={setEntry}
        variant={variant}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onFocus={() => setIsHovered(true)}
        secondaryAction={
          isHovered || isMenuOpen || isMobile ? (
            <>
              <Tooltip placement="right" title={t('contacts.menu.more')}>
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
          onClick={() => onNavigate(addressBookPath(book.id))}
          selected={selected}
          aria-current={getAriaCurrent(selected)}
        >
          <NavIcon icon={Peoples} />
          {/* beside the whole entry, not the name: an interactive tooltip next to
              the name would cover the "More actions" button of the entry */}
          <Tooltip
            placement="right"
            title={getAddressBookDisplayName(book, t)}
            slotProps={entry ? { popper: { anchorEl: entry } } : undefined}
          >
            <NavText className="u-mr-1" secondaryText={book.ownerDisplayName}>
              <Box className="u-ellipsis">
                {getAddressBookDisplayName(book, t)}
              </Box>
            </NavText>
          </Tooltip>
        </NavLink>
        {/* inside the entry: the sidebar list only holds <li> elements */}
        {dialogs}
      </NavItem>
    </>
  )
}
