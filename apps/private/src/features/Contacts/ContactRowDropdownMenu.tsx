import {
  ActionsMenu,
  ActionsMenuItem,
  ListItemIcon,
  ListItemText,
  useBreakpoints
} from '@linagora/twake-mui'
import {
  Icon,
  Pen,
  Trash,
  EmailOpen,
  CalendarToday,
  Discuss,
  Copy,
  Download,
  Moveto
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
  onEdit?: () => void
  onOpenDeleteDialog: () => void
  onOpenCopyDialog?: () => void
  onOpenMoveDialog?: () => void
  onExport?: () => void
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
  onEdit,
  onOpenDeleteDialog,
  onOpenCopyDialog,
  onOpenMoveDialog,
  onExport,
  readOnly
}) => {
  const { t } = useI18n()
  const { isMobile } = useBreakpoints()
  const isMenuOpen = Boolean(anchorEl)

  const workplaceFqdn = useAppSelector(
    state => state.user.userData?.workplaceFqdn
  )

  const firstEmail = getFirstEmail(contact)
  const chatTarget = getChatTarget(contact)

  const handleSendMail = (): void => {
    onClose()
    if (!firstEmail) return

    openMailComposer(firstEmail, { workplaceFqdn })
  }

  const handleOpenChat = (): void => {
    onClose()
    if (!chatTarget) return

    openChat(chatTarget, { workplaceFqdn })
  }

  const handleCreateEvent = (): void => {
    onClose()
    if (!firstEmail) return

    openCalendarEvent(firstEmail, {
      workplaceFqdn
    })
  }

  return (
    <ActionsMenu
      ref={{ current: anchorEl }}
      open={isMenuOpen}
      onClose={onClose}
      onClick={e => e.stopPropagation()}
    >
      {isMobile && !readOnly && onEdit && (
        <ActionsMenuItem onClick={onEdit}>
          <ListItemIcon>
            <Icon icon={Pen} />
          </ListItemIcon>
          <ListItemText>{t('contacts.menu.edit')}</ListItemText>
        </ActionsMenuItem>
      )}
      <ActionsMenuItem onClick={handleSendMail} disabled={!firstEmail}>
        <ListItemIcon>
          <Icon icon={EmailOpen} />
        </ListItemIcon>
        <ListItemText>{t('contacts.menu.sendMail')}</ListItemText>
      </ActionsMenuItem>
      {chatTarget && (
        <ActionsMenuItem onClick={handleOpenChat}>
          <ListItemIcon>
            <Icon icon={Discuss} />
          </ListItemIcon>
          <ListItemText>{t('contacts.menu.openChat')}</ListItemText>
        </ActionsMenuItem>
      )}
      <ActionsMenuItem onClick={handleCreateEvent} disabled={!firstEmail}>
        <ListItemIcon>
          <Icon icon={CalendarToday} />
        </ListItemIcon>
        <ListItemText>{t('contacts.menu.createEvent')}</ListItemText>
      </ActionsMenuItem>
      {!readOnly && onOpenCopyDialog && (
        <ActionsMenuItem onClick={onOpenCopyDialog}>
          <ListItemIcon>
            <Icon icon={Copy} />
          </ListItemIcon>
          <ListItemText>{t('contacts.copyContact.title')}</ListItemText>
        </ActionsMenuItem>
      )}
      {!readOnly && onOpenMoveDialog && (
        <ActionsMenuItem onClick={onOpenMoveDialog}>
          <ListItemIcon>
            <Icon icon={Moveto} />
          </ListItemIcon>
          <ListItemText>{t('contacts.moveContact.title')}</ListItemText>
        </ActionsMenuItem>
      )}
      {onExport && (
        <ActionsMenuItem onClick={onExport}>
          <ListItemIcon>
            <Icon icon={Download} />
          </ListItemIcon>
          <ListItemText>{t('contacts.menu.export')}</ListItemText>
        </ActionsMenuItem>
      )}
      {!readOnly && (
        <ActionsMenuItem onClick={onOpenDeleteDialog}>
          <ListItemIcon>
            <Icon icon={Trash} />
          </ListItemIcon>
          <ListItemText>{t('contacts.menu.delete')}</ListItemText>
        </ActionsMenuItem>
      )}
    </ActionsMenu>
  )
}
