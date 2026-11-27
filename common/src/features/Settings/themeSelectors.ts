import type { RootState } from '@common/app/store'
import { isThemeSetting, type ThemeSetting } from './SettingsSlice'

/**
 * The debug toggle wins, for this page only; then the shared `core` theme of
 * the user configuration; light while it is not loaded, or holds no theme this
 * app knows.
 */
export const selectThemeSetting = (state: RootState): ThemeSetting => {
  const { themeOverride } = state.settings
  if (themeOverride) return themeOverride
  const shared = state.user.coreConfig.theme
  return isThemeSetting(shared) ? shared : 'light'
}

export const selectIsHighContrast = (state: RootState): boolean =>
  state.settings.contrastMode === 'more'
