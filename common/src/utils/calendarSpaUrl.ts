import {
  generateCalendarEventUrl,
  type UriTemplateContext
} from '@linagora/twake-utils'

/**
 * Open the calendar event creation in a new tab for the given attendee(s).
 * Uses CALENDAR_SPA_URL configuration.
 *
 * @param attendees - The attendee email address(es)
 * @param context - Optional context for URL resolution (localpart, workplaceFqdn)
 * @returns true if the calendar was opened, false if CALENDAR_SPA_URL is not configured
 */
export function openCalendarEvent(
  attendees: string | string[],
  context: Omit<UriTemplateContext, 'target'> = {}
): boolean {
  const template = window.CALENDAR_SPA_URL
  if (!template) return false

  const attendeeList = Array.isArray(attendees) ? attendees : [attendees]
  const url = generateCalendarEventUrl(template, attendeeList, {
    ...context,
    workplaceFqdnFallback: window.WORKPLACE_FQDN_FALLBACK
  })
  if (!url) return false

  window.open(url, '_blank', 'noopener,noreferrer')
  return true
}
