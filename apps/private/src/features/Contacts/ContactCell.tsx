import { ContactEntry } from '@common/features/Contacts/contactsTypes'
import {
  Chip,
  ContactPopover,
  Skeleton,
  Stack,
  Tooltip,
  Typography,
  VirtualizedTableColumn,
  VirtualizedTableRow
} from '@linagora/twake-mui'
import {
  generateMailComposerUrl,
  generateCalendarEventUrl,
  resolveChatSpaUrl
} from '@linagora/twake-utils'
import React from 'react'
import { useI18n } from 'twake-i18n'
import { useAppSelector } from '@common/app/hooks'
import { ContactRowActions } from './ContactRowActions'
import { ContactAvatar } from './ContactAvatar'
import { ContactNamePopover } from './ContactNamePopover'

interface ContactCellProps {
  row?: VirtualizedTableRow
  column?: VirtualizedTableColumn
  cell?: unknown
}

export const ContactCell: React.FC<ContactCellProps> = ({
  row,
  column,
  cell
}) => {
  const { t } = useI18n()
  const workplaceFqdn = useAppSelector(
    state => state.user.userData?.workplaceFqdn
  )
  if (!row || !column) return null
  if (row.loadingMore) {
    return column.skeleton ?? <Skeleton animation="wave" variant="text" />
  }
  const { contact, addressBookId } = row as unknown as ContactEntry
  const readOnly = addressBookId === 'dab'

  switch (column.id) {
    case 'contact.displayName': {
      const firstEmail = contact.emails[0]?.value
      const matrixProfile = contact.socialProfiles?.find(
        p => p.type?.toLowerCase() === 'matrix'
      )
      const chatTarget = matrixProfile?.value

      const mailUrl =
        firstEmail && window.MAIL_SPA_URL
          ? generateMailComposerUrl(window.MAIL_SPA_URL, [firstEmail], {
              workplaceFqdn,
              workplaceFqdnFallback: window.WORKPLACE_FQDN_FALLBACK
            })
          : null
      const calendarUrl =
        firstEmail && window.CALENDAR_SPA_URL
          ? generateCalendarEventUrl(window.CALENDAR_SPA_URL, [firstEmail], {
              workplaceFqdn,
              workplaceFqdnFallback: window.WORKPLACE_FQDN_FALLBACK
            })
          : null
      const chatUrl =
        chatTarget && window.CHAT_SPA_URL
          ? resolveChatSpaUrl(window.CHAT_SPA_URL, {
              target: chatTarget,
              workplaceFqdn,
              workplaceFqdnFallback: window.WORKPLACE_FQDN_FALLBACK
            })
          : null

      const hasActions = mailUrl ?? calendarUrl ?? chatUrl

      const nameElement = (
        <Stack direction="row" spacing={2}>
          <ContactAvatar size="s" displayName={contact.displayName} />
          <Typography className="u-maw-6" noWrap>
            {contact.displayName}
          </Typography>
        </Stack>
      )

      if (!hasActions) {
        return nameElement
      }

      return (
        <ContactNamePopover name={contact.displayName} email={firstEmail ?? ''}>
          {nameElement}
          <ContactPopover.Actions>
            <ContactPopover.EmailAction url={mailUrl} disabled={!mailUrl} />
            <Tooltip disableInteractive title={t('contacts.menu.createEvent')}>
              <span>
                <ContactPopover.CalendarAction
                  url={calendarUrl}
                  disabled={!calendarUrl}
                />
              </span>
            </Tooltip>
            <Tooltip disableInteractive title={t('contacts.menu.openChat')}>
              <span>
                <ContactPopover.ChatAction url={chatUrl} disabled={!chatUrl} />
              </span>
            </Tooltip>
          </ContactPopover.Actions>
        </ContactNamePopover>
      )
    }
    case 'contact.categories':
      return (
        <Stack direction="row" spacing={1}>
          {contact.categories?.map(category => (
            <Chip key={category} label={category} size="small" square />
          ))}
        </Stack>
      )
    case 'actions':
      return (
        <ContactRowActions
          contact={contact}
          addressBookId={addressBookId}
          readOnly={readOnly}
        />
      )
    default: {
      const text = typeof cell === 'string' ? cell : '—'
      return (
        <Typography className="u-maw-6" noWrap>
          {text}
        </Typography>
      )
    }
  }
}
