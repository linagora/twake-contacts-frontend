import {
  generateCalendarEventUrl,
  type UriTemplateContext
} from '@linagora/twake-utils'

/**
 * Open the calendar event creation in a new tab for the given attendee.
 * Uses CALENDAR_SPA_URL configuration.
 *
 * @param attendee - The attendee email address
 * @param context - Optional context for URL resolution (localpart, workplaceFqdn)
 * @returns true if the calendar was opened, false if CALENDAR_SPA_URL is not configured
 */
export function openCalendarEvent(
  attendee: string,
  context: Omit<UriTemplateContext, 'target'> = {}
): boolean {
  const template = window.CALENDAR_SPA_URL
  if (!template) return false

  const url = generateCalendarEventUrl(template, attendee, {
    ...context,
    workplaceFqdnFallback: window.WORKPLACE_FQDN_FALLBACK
  })
  if (!url) return false

  window.open(url, '_blank', 'noopener,noreferrer')
  return true
}
