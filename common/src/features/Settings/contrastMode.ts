export type ContrastMode = 'default' | 'more'

export const CONTRAST_STORAGE_KEY = 'contrast'

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

/**
 * The stored choice wins; with nothing stored, the OS "more contrast" or
 * forced-colors setting turns the high-contrast scheme on.
 */
export const readInitialContrastMode = (
  storage: Pick<Storage, 'getItem'> = localStorage,
  matchMedia: Window['matchMedia'] | undefined = typeof window === 'undefined'
    ? undefined
    : window.matchMedia?.bind(window)
): ContrastMode => {
  const stored = storage.getItem(CONTRAST_STORAGE_KEY)
  if (isContrastMode(stored)) return stored
  return systemPrefersMoreContrast(matchMedia) ? 'more' : 'default'
}
