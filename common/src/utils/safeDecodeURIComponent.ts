/**
 * Decodes percent escapes, giving the value back as is when it is not
 * valid percent-encoding (e.g. a lone `%`).
 */
export function safeDecodeURIComponent(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}
