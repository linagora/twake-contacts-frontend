import { safeDecodeURIComponent } from './safeDecodeURIComponent'

export function stripMailto(email?: string): string {
  return (email ?? '').trim().replace(/^mailto:/i, '')
}

export const TEL_SCHEME = /^tel:/i
const PHONE_CONTEXT_PARAM = /;phone-context=[^;]*/gi

/**
 * Turns a TEL value into the number as a person reads it: removes the
 * `tel:` scheme (case-insensitive) and, for RFC 3966 URIs, the
 * `phone-context` parameter and percent escapes.
 */
export function stripTel(phone?: string): string {
  const trimmed = (phone ?? '').trim()
  if (!TEL_SCHEME.test(trimmed)) return trimmed
  const withoutScheme = trimmed.replace(TEL_SCHEME, '')
  return safeDecodeURIComponent(
    withoutScheme.replace(PHONE_CONTEXT_PARAM, '')
  ).trim()
}

export function normalizeIdentity(email?: string): string {
  return stripMailto(email).toLowerCase()
}
