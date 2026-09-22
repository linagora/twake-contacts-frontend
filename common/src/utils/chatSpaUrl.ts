import {
  resolveChatSpaUrl,
  type UriTemplateContext
} from '@linagora/twake-utils'

/**
 * Open the chat with the given target in a new tab.
 * Uses CHAT_SPA_URL configuration.
 *
 * @param target - The target user identifier (Matrix ID or email)
 * @param context - Optional context for URL resolution (localpart, workplaceFqdn)
 * @returns true if the chat was opened, false if CHAT_SPA_URL is not configured
 */
export function openChat(
  target: string,
  context: Omit<UriTemplateContext, 'target'> = {}
): boolean {
  const template = window.CHAT_SPA_URL
  if (!template) return false

  const url = resolveChatSpaUrl(template, {
    ...context,
    target,
    workplaceFqdnFallback: window.WORKPLACE_FQDN_FALLBACK
  })
  if (!url) return false

  window.open(url, '_blank', 'noopener,noreferrer')
  return true
}
