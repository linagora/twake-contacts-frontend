import {
  generateMailComposerUrl,
  type UriTemplateContext
} from '@linagora/twake-utils'

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
  const template = window.MAIL_SPA_URL
  if (!template) return false

  const url = generateMailComposerUrl(template, recipient, {
    ...context,
    workplaceFqdnFallback: window.WORKPLACE_FQDN_FALLBACK
  })
  if (!url) return false

  window.open(url, '_blank', 'noopener,noreferrer')
  return true
}
