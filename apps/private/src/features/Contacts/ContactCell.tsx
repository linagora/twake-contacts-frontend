import { ContactEntry } from '@common/features/Contacts/contactsTypes'
import {
  Avatar,
  Box,
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
}

// The popover is portaled but React still bubbles its events (backdrop
// included) through the component tree, up to the row click handler that
// would open the contact owning the popover.
const stopPortaledClickPropagation = (event: React.MouseEvent): void => {
  if (!event.currentTarget.contains(event.target as Node)) {
    event.stopPropagation()
  }
}

export const ContactCell: React.FC<ContactCellProps> = ({
  row,
  column,
  cell
}) => {
  if (!row || !column) return null
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
        <Box onClick={stopPortaledClickPropagation}>
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
        </Box>
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
