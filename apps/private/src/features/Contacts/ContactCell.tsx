import { ContactEntry } from '@common/features/Contacts/contactsTypes'
import {
  Avatar,
  Chip,
  ContactPopover,
  Stack,
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
import { ContactRowActions } from './ContactRowActions'
import { getInitials } from './getInitials'

interface ContactCellProps {
  row?: VirtualizedTableRow
  column?: VirtualizedTableColumn
  cell?: unknown
  readOnly?: boolean
}

export const ContactCell: React.FC<ContactCellProps> = ({
  row,
  column,
  cell,
  readOnly
}) => {
  if (!row || !column) return null
  const { contact, addressBookId } = row as unknown as ContactEntry

  switch (column.id) {
    case 'contact.displayName': {
      const firstEmail = contact.emails[0]?.value
      const matrixProfile = contact.socialProfiles?.find(
        p => p.type?.toLowerCase() === 'matrix'
      )
      const chatTarget = matrixProfile?.value

      const mailUrl =
        firstEmail && window.MAIL_SPA_URL
          ? generateMailComposerUrl(window.MAIL_SPA_URL, firstEmail, {
              workplaceFqdnFallback: window.WORKPLACE_FQDN_FALLBACK
            })
          : null
      const calendarUrl =
        firstEmail && window.CALENDAR_SPA_URL
          ? generateCalendarEventUrl(window.CALENDAR_SPA_URL, firstEmail, {
              workplaceFqdnFallback: window.WORKPLACE_FQDN_FALLBACK
            })
          : null
      const chatUrl =
        chatTarget && window.CHAT_SPA_URL
          ? resolveChatSpaUrl(window.CHAT_SPA_URL, {
              target: chatTarget,
              workplaceFqdnFallback: window.WORKPLACE_FQDN_FALLBACK
            })
          : null

      const hasActions = mailUrl ?? calendarUrl ?? chatUrl

      const nameElement = (
        <Stack direction="row" spacing={2}>
          <Avatar size="s">{getInitials(contact.displayName)}</Avatar>
          <Typography>{contact.displayName}</Typography>
        </Stack>
      )

      if (!hasActions) {
        return nameElement
      }

      return (
        <ContactPopover name={contact.displayName} email={firstEmail ?? ''}>
          {nameElement}
          <ContactPopover.Actions>
            <ContactPopover.EmailAction url={mailUrl} disabled={!mailUrl} />
            <ContactPopover.CalendarAction
              url={calendarUrl}
              disabled={!calendarUrl}
            />
            <ContactPopover.ChatAction url={chatUrl} disabled={!chatUrl} />
          </ContactPopover.Actions>
        </ContactPopover>
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
    default:
      return <>{typeof cell === 'string' ? cell : '—'}</>
  }
}
