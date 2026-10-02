import {
  generateMailComposerUrl,
  type UriTemplateContext
} from '@linagora/twake-utils'

/**
 * Open the mail composer in a new tab for the given recipient(s).
 * Uses MAIL_SPA_URL configuration.
 *
 * @param recipients - The recipient email address(es)
 * @param context - Optional context for URL resolution (localpart, workplaceFqdn)
 * @returns true if the composer was opened, false if MAIL_SPA_URL is not configured
 */
export function openMailComposer(
  recipients: string | string[],
  context: Omit<UriTemplateContext, 'target'> = {}
): boolean {
  const template = window.MAIL_SPA_URL
  if (!template) return false

  const recipientList = Array.isArray(recipients) ? recipients : [recipients]
  const url = generateMailComposerUrl(template, recipientList, {
    ...context,
    workplaceFqdnFallback: window.WORKPLACE_FQDN_FALLBACK
  })
  if (!url) return false

  window.open(url, '_blank', 'noopener,noreferrer')
  return true
}
