import { resolveUriTemplate, UriTemplateContext } from './uriTemplateUtils'
import { resolveUriTemplate, UriTemplateContext } from './uriTemplateUtils'

/**
 * Resolve the MAIL_SPA_URL configuration entry.
 *
 * MAIL_SPA_URL is a URI template (RFC 6570 style) so it can support platform
 * mode, the same way VIDEO_CONFERENCE_BASE_URL does. See
 * {@link resolveUriTemplate} for the list of supported expressions.
 *
 * @returns the resolved base URL, or null when MAIL_SPA_URL is not configured.
 */
export function resolveMailSpaUrl(
  context: UriTemplateContext = {}
): string | null {
  const template = window.MAIL_SPA_URL
  if (!template) return null

  return resolveUriTemplate(template, context)
}

/**
 * Build the full mail composer URL for a given recipient.
 * Constructs the URL in the format: {mailSpaUrl}/mailto/?uri=mailto:{recipient}
 *
 * @param mailSpaUrl - The resolved mail SPA base URL
 * @param recipient - The recipient email address
 * @returns The full composer URL
 */
export function buildMailComposerUrl(
  mailSpaUrl: string,
  recipient: string
): string {
  return `${mailSpaUrl}/mailto/?uri=${encodeURIComponent(`mailto:${recipient}`)}`
}

/**
 * Open the mail composer in a new tab for the given recipient.
 * Uses MAIL_SPA_URL configuration.
 *
 * @param recipient - The recipient email address
 * @param context - Optional context for URL resolution (localpart, workplaceFqdn)
 * @returns true if the composer was opened, false if MAIL_SPA_URL is not configured
 */
export function openMailComposer(
  recipient: string,
  context: Omit<UriTemplateContext, 'target'> = {}
): boolean {
  const mailSpaUrl = resolveMailSpaUrl(context)
  if (!mailSpaUrl) return false

  window.open(
    buildMailComposerUrl(mailSpaUrl, recipient),
    '_blank',
    'noopener,noreferrer'
  )
  return true
}
