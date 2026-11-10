/**
 * Translation keys that never appear as a string literal in the code: keys
 * built at runtime and keys read by libraries. Every key of en.json must be
 * either used literally or listed here (see translationKeys.test.ts).
 */

const CONTACT_TYPE_KEYS = {
  cell: 'contacts.types.cell',
  work: 'contacts.types.work',
  home: 'contacts.types.home',
  other: 'contacts.types.other'
} as const

/** Keys of @linagora/twake-mui components overridden by the app dictionary. */
const TWAKE_MUI_KEYS = ['ContactPopover.emailButton'] as const

/** Keys read by @linagora/twake-bar through the app dictionary. */
const TWAKE_BAR_KEYS = [
  'twakeBar.home',
  'twakeBar.apps',
  'twakeBar.help',
  'twakeBar.userMenu',
  'twakeBar.noApps',
  'twakeBar.manageProfile',
  'twakeBar.storage',
  'twakeBar.gbAvailable',
  'twakeBar.emailDomainNotActive',
  'twakeBar.logOut'
] as const

export const DYNAMIC_KEYS: readonly string[] = [
  ...Object.values(CONTACT_TYPE_KEYS),
  ...TWAKE_MUI_KEYS,
  ...TWAKE_BAR_KEYS
]

const isContactType = (type: string): type is keyof typeof CONTACT_TYPE_KEYS =>
  Object.hasOwn(CONTACT_TYPE_KEYS, type)

/**
 * Translates a vCard type (cell, work, ...), falling back to the raw type
 * when it has no translation.
 */
export const translateContactType = (
  type: string,
  t: (key: string) => string
): string => {
  const normalizedType = type.toLowerCase()
  return isContactType(normalizedType)
    ? t(CONTACT_TYPE_KEYS[normalizedType])
    : type
}
