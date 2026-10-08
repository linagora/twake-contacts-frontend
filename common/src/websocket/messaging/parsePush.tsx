export interface AddressBookPush {
  syncToken?: string
  imports?: Record<
    string,
    { status: string; succeedCount?: number; failedCount?: number }
  >
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

export function parsePush(
  message: unknown
): Record<string, AddressBookPush> | null {
  let raw: unknown = message
  if (typeof message === 'string') {
    try {
      raw = JSON.parse(message)
    } catch {
      return null
    }
  }
  if (!isRecord(raw)) return null

  const entries = Object.entries(raw).filter(([, push]) => isRecord(push))
  return Object.fromEntries(entries) as Record<string, AddressBookPush>
}
