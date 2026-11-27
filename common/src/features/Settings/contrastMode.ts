export type ContrastMode = 'default' | 'more'

const MORE_CONTRAST_QUERIES = [
  '(prefers-contrast: more)',
  '(forced-colors: active)'
]

/**
 * The OS "more contrast" or forced-colors setting turns the high-contrast
 * scheme on. The toggle only changes it for the page: nothing is stored.
 */
export const readInitialContrastMode = (
  matchMedia: Window['matchMedia'] | undefined = typeof window === 'undefined'
    ? undefined
    : window.matchMedia?.bind(window)
): ContrastMode =>
  !!matchMedia && MORE_CONTRAST_QUERIES.some(query => matchMedia(query).matches)
    ? 'more'
    : 'default'
