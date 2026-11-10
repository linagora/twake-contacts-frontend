export type ContrastMode = 'default' | 'more'

const CONTRAST_STORAGE_KEY = 'contrast'

const isContrastMode = (value: string | null): value is ContrastMode =>
  value === 'default' || value === 'more'

const MORE_CONTRAST_QUERIES = [
  '(prefers-contrast: more)',
  '(forced-colors: active)'
]

const systemPrefersMoreContrast = (
  matchMedia: Window['matchMedia'] | undefined
): boolean =>
  !!matchMedia && MORE_CONTRAST_QUERIES.some(query => matchMedia(query).matches)

// Blocked storage (privacy modes, sandboxed iframes) throws on access.
const readStoredContrastMode = (
  storage: Pick<Storage, 'getItem'> | undefined
): string | null => {
  try {
    return (storage ?? localStorage).getItem(CONTRAST_STORAGE_KEY)
  } catch {
    return null
  }
}

/**
 * The stored choice wins; with nothing stored, the OS "more contrast" or
 * forced-colors setting turns the high-contrast scheme on.
 */
export const readInitialContrastMode = (
  storage?: Pick<Storage, 'getItem'>,
  matchMedia: Window['matchMedia'] | undefined = typeof window === 'undefined'
    ? undefined
    : window.matchMedia?.bind(window)
): ContrastMode => {
  const stored = readStoredContrastMode(storage)
  if (isContrastMode(stored)) return stored
  return systemPrefersMoreContrast(matchMedia) ? 'more' : 'default'
}

/** Full or blocked storage must not prevent switching the mode. */
export const persistContrastMode = (
  mode: ContrastMode,
  storage?: Pick<Storage, 'setItem'>
): void => {
  try {
    const target = storage ?? localStorage
    target.setItem(CONTRAST_STORAGE_KEY, mode)
  } catch {
    // the choice stays in memory for this session
  }
}
