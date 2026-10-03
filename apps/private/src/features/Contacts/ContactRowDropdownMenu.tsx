import { Menu, MenuItem, ListItemIcon, ListItemText } from '@linagora/twake-mui'
import {
  Icon,
  Trash,
  EmailOpen,
  CalendarToday,
  Discuss
} from '@linagora/twake-icons'
import { useI18n } from 'twake-i18n'
import { useAppSelector } from '@common/app/hooks'
import { Contact } from '@common/features/Contacts/contactsTypes'
import { openCalendarEvent } from '@common/utils/calendarSpaUrl'
import { openChat } from '@common/utils/chatSpaUrl'
import { openMailComposer } from '@common/utils/mailSpaUrl'

interface ContactRowDropdownMenuProps {
  contact: Contact
  anchorEl: null | HTMLElement
  onClose: () => void
  onOpenDeleteDialog: () => void
  readOnly?: boolean
}

const getFirstEmail = (contact: Contact): string => contact?.emails?.[0]?.value

const getChatTarget = (contact: Contact): string | undefined => {
  const matrixProfile = contact?.socialProfiles?.find(
    p => p.type?.toLowerCase() === 'matrix'
  )
  return matrixProfile?.value
}

export const ContactRowDropdownMenu: React.FC<ContactRowDropdownMenuProps> = ({
  contact,
  anchorEl,
  onClose,
  onOpenDeleteDialog,
  readOnly
}) => {
  const { t } = useI18n()
  const isMenuOpen = Boolean(anchorEl)

  const workplaceFqdn = useAppSelector(
    state => state.user.userData?.workplaceFqdn
  )

  const firstEmail = getFirstEmail(contact)
  const chatTarget = getChatTarget(contact)

  const handleMenuClose = (event: React.MouseEvent): void => {
    event.stopPropagation()
    onClose()
  }

  const handleSendMail = (event: React.MouseEvent): void => {
    event.stopPropagation()
    if (!firstEmail) return

    openMailComposer(firstEmail, { workplaceFqdn })
  }

  const handleOpenChat = (event: React.MouseEvent): void => {
    event.stopPropagation()
    if (!chatTarget) return

    openChat(chatTarget, { workplaceFqdn })
  }

  const handleCreateEvent = (event: React.MouseEvent): void => {
    event.stopPropagation()
    if (!firstEmail) return

    openCalendarEvent(firstEmail, {
      workplaceFqdn
    })
  }

  return (
    <Menu
      anchorEl={anchorEl}
      open={isMenuOpen}
      onClose={handleMenuClose}
      onClick={e => e.stopPropagation()}
    >
      <MenuItem onClick={handleSendMail} disabled={!firstEmail}>
        <ListItemIcon>
          <Icon icon={EmailOpen} />
        </ListItemIcon>
        <ListItemText>{t('contacts.menu.sendMail')}</ListItemText>
      </MenuItem>
      {chatTarget && (
        <MenuItem onClick={handleOpenChat}>
          <ListItemIcon>
            <Icon icon={Discuss} />
          </ListItemIcon>
          <ListItemText>{t('contacts.menu.openChat')}</ListItemText>
        </MenuItem>
      )}
      <MenuItem onClick={handleCreateEvent} disabled={!firstEmail}>
        <ListItemIcon>
          <Icon icon={CalendarToday} />
        </ListItemIcon>
        <ListItemText>{t('contacts.menu.createEvent')}</ListItemText>
      </MenuItem>
      {!readOnly && (
        <MenuItem onClick={onOpenDeleteDialog}>
          <ListItemIcon>
            <Icon icon={Trash} />
          </ListItemIcon>
          <ListItemText>{t('contacts.menu.delete')}</ListItemText>
        </MenuItem>
      )}
    </Menu>
  )
}
