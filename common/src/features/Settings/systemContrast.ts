const MORE_CONTRAST_QUERIES = [
  '(prefers-contrast: more)',
  '(forced-colors: active)'
]

/** The OS "more contrast" or forced-colors setting asks for high contrast */
export const prefersMoreContrast = (
  matchMedia: Window['matchMedia'] | undefined = typeof window === 'undefined'
    ? undefined
    : window.matchMedia?.bind(window)
): boolean =>
  !!matchMedia && MORE_CONTRAST_QUERIES.some(query => matchMedia(query).matches)
