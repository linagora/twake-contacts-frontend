import { resolveUriTemplate, UriTemplateContext } from './uriTemplateUtils'
import { resolveUriTemplate, UriTemplateContext } from './uriTemplateUtils'

/**
 * Resolve the CHAT_SPA_URL configuration entry.
 *
 * CHAT_SPA_URL is a URI template (RFC 6570 style).
 *
 * @returns the resolved base URL, or null when CHAT_SPA_URL is not configured.
 */
export function resolveChatSpaUrl(
  context: UriTemplateContext = {}
): string | null {
  const template = window.CHAT_SPA_URL
  if (!template) return null

  return resolveUriTemplate(template, context)
}

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
  const chatSpaUrl = resolveChatSpaUrl({ ...context, target })
  if (!chatSpaUrl) return false

  window.open(chatSpaUrl, '_blank', 'noopener,noreferrer')
  return true
}
