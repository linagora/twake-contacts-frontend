import { resolveUriTemplate, UriTemplateContext } from './uriTemplateUtils'

/**
 * Resolve the CALENDAR_SPA_URL configuration entry.
 *
 * CALENDAR_SPA_URL is a URI template (RFC 6570 style).
 *
 * @returns the resolved base URL, or null when CALENDAR_SPA_URL is not configured.
 */
export function resolveCalendarSpaUrl(
  context: UriTemplateContext = {}
): string | null {
  const template = window.CALENDAR_SPA_URL
  if (!template) return null

  return resolveUriTemplate(template, context)
}

/**
 * Build the full calendar event creation URL for a given attendee.
 * Constructs the URL in the format: {calendarSpaUrl}/newEvent?attendee={email}
 *
 * @param calendarSpaUrl - The resolved calendar SPA base URL
 * @param attendee - The attendee email address
 * @returns The full event creation URL
 */
export function buildCalendarEventUrl(
  calendarSpaUrl: string,
  attendee: string
): string {
  return `${calendarSpaUrl}/newEvent?attendee=${encodeURIComponent(attendee)}`
}

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
  const calendarSpaUrl = resolveCalendarSpaUrl(context)
  if (!calendarSpaUrl) return false

  window.open(
    buildCalendarEventUrl(calendarSpaUrl, attendee),
    '_blank',
    'noopener,noreferrer'
  )
  return true
}
