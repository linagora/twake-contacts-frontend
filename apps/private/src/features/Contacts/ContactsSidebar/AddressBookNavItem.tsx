import { addressBookPath } from '../contactPath'
import React, { useEffect, useState } from 'react'
import { useAppDispatch } from '@common/app/hooks'
import { isOwnAddressBook } from '@common/features/Contacts/addressBookModel'
import { AddressBook } from '@common/features/Contacts/contactsTypes'
import { getAddressBookDisplayName } from '@common/features/Contacts/contactsUtils'
import { fetchAddressBookDetail } from '@common/features/Contacts/ContactsSlice'
import { Dots, Icon, Peoples, ShareExternal } from '@linagora/twake-icons'
import {
  Box,
  IconButton,
  NavIcon,
  NavItem,
  NavLink,
  NavText,
  Stack,
  Tooltip,
  useBreakpoints
} from '@linagora/twake-mui'
import { useNavigate } from 'react-router'
import { useI18n } from 'twake-i18n'
import { getSharingStatus } from '../AddressBookActions/sharingStatus'
import { useAddressBookActions } from '../AddressBookActions/useAddressBookActions'
import { FOCUS_HEADING_STATE } from '../focusHeadingOnArrival'
import { getAriaCurrent } from './sidebarHelpers'

export interface AddressBookNavItemProps {
  book: AddressBook
  selected: boolean
  variant: 'primary' | 'secondary' | 'tertiary' | undefined
  onNavigate: (path: string) => void
}

// the members of a book of the user are only listed with its details: they
// are read for the sidebar to tell with how many people it is shared
const useOwnBookMembers = (book: AddressBook): void => {
  const dispatch = useAppDispatch()
  const isOwnBook = isOwnAddressBook(book)
  useEffect(() => {
    if (!isOwnBook) return
    void dispatch(
      fetchAddressBookDetail({
        userId: book.userId,
        addressBookId: book.id,
        silent: true
      })
    )
      .unwrap()
      .catch(() => undefined)
  }, [dispatch, isOwnBook, book.userId, book.id])
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
  useOwnBookMembers(book)
  const { isMenuOpen, openMenu, menu, dialogs } = useAddressBookActions({
    book,
    onRemoved: () => {
      if (selected) void navigate('/contacts', { state: FOCUS_HEADING_STATE })
    }
  })

  const sharingStatus = getSharingStatus(book)
  const shareTooltip =
    sharingStatus?.kind === 'owned'
      ? sharingStatus.membersCount > 0
        ? t('contacts.addressBook.sharedWith', {
            smart_count: sharingStatus.membersCount
          })
        : t('contacts.addressBook.public')
      : undefined

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
          <NavText className="u-mr-1" secondaryText={book.ownerDisplayName}>
            <Stack
              direction="row"
              spacing={0.5}
              className="u-flex-items-center u-ov-hidden"
            >
              <Tooltip
                placement="right"
                title={getAddressBookDisplayName(book, t)}
                slotProps={entry ? { popper: { anchorEl: entry } } : undefined}
              >
                <Box className="u-ellipsis">
                  {getAddressBookDisplayName(book, t)}
                </Box>
              </Tooltip>
              {shareTooltip && (
                <Tooltip placement="top" title={shareTooltip}>
                  <Box
                    component="span"
                    className="u-flex u-flex-items-center"
                    aria-label={shareTooltip}
                  >
                    <Icon icon={ShareExternal} size={14} />
                  </Box>
                </Tooltip>
              )}
            </Stack>
          </NavText>
        </NavLink>
        {/* inside the entry: the sidebar list only holds <li> elements */}
        {dialogs}
      </NavItem>
    </>
  )
}
