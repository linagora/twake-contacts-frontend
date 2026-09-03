export function stripMailto(email?: string): string {
  return (email ?? '').trim().replace(/^mailto:/i, '')
}

export function normalizeIdentity(email?: string): string {
  return stripMailto(email).toLowerCase()
}
