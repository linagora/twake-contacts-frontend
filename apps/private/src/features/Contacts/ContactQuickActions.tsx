import { useAppSelector } from '@common/app/hooks'
import { Contact } from '@common/features/Contacts/contactsTypes'
import { openCalendarEvent } from '@common/utils/calendarSpaUrl'
import { openChat } from '@common/utils/chatSpaUrl'
import { openMailComposer } from '@common/utils/mailSpaUrl'
import { CalendarToday, Discuss, EmailOpen, Icon } from '@linagora/twake-icons'
import { Button, Stack, useBreakpoints } from '@linagora/twake-mui'
import { useI18n } from 'twake-i18n'

export interface ContactQuickActionsProps {
  contact: Contact
}

interface QuickActionButtonProps {
  icon: React.ComponentType
  label: string
  testId: string
  onClick: () => void
  disabled?: boolean
  isMobile: boolean
}

const getFirstEmail = (contact: Contact): string | undefined =>
  contact.emails[0]?.value

const getChatTarget = (contact: Contact): string | undefined =>
  contact.socialProfiles?.find(p => p.type?.toLowerCase() === 'matrix')?.value

const QuickActionButton: React.FC<QuickActionButtonProps> = ({
  icon,
  label,
  testId,
  onClick,
  disabled,
  isMobile
}) => (
  <Button
    variant={disabled ? 'contained' : 'ghost'}
    startIcon={!isMobile ? <Icon icon={icon} /> : undefined}
    aria-label={label}
    data-testid={testId}
    onClick={onClick}
    disabled={disabled}
  >
    {isMobile ? <Icon icon={icon} /> : label}
  </Button>
)

export const ContactQuickActions: React.FC<ContactQuickActionsProps> = ({
  contact
}) => {
  const { t } = useI18n()
  const { isMobile } = useBreakpoints()
  const workplaceFqdn = useAppSelector(
    state => state.user.userData?.workplaceFqdn
  )

  const firstEmail = getFirstEmail(contact)
  const chatTarget = getChatTarget(contact)

  const actions = [
    {
      icon: EmailOpen,
      label: t('contacts.menu.mail'),
      testId: 'contact-mail-button',
      onClick: (): void => {
        if (firstEmail) openMailComposer(firstEmail, { workplaceFqdn })
      },
      disabled: !firstEmail
    },
    {
      icon: Discuss,
      label: t('contacts.menu.chat'),
      testId: 'contact-chat-button',
      onClick: (): void => {
        if (chatTarget) openChat(chatTarget, { workplaceFqdn })
      },
      disabled: !chatTarget
    },
    {
      icon: CalendarToday,
      label: t('contacts.menu.schedule'),
      testId: 'contact-calendar-button',
      onClick: (): void => {
        if (firstEmail) openCalendarEvent(firstEmail, { workplaceFqdn })
      },
      disabled: !firstEmail
    }
  ]

  return (
    <Stack
      direction="row"
      spacing={2}
      className={isMobile ? 'u-flex-justify-center' : ''}
    >
      {actions.map(action => (
        <QuickActionButton
          key={action.testId}
          isMobile={isMobile}
          {...action}
        />
      ))}
    </Stack>
  )
}
