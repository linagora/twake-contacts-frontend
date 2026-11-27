import type { RootState } from '@common/app/store'
import { isThemeSetting, type ThemeChoice } from './SettingsSlice'

/**
 * The theme picker wins, for this page only; then the shared `core` theme of
 * the user configuration; light while it is not loaded, or holds no theme this
 * app knows.
 */
export const selectTheme = (state: RootState): ThemeChoice => {
  const { themeOverride } = state.settings
  if (themeOverride) return themeOverride
  const shared = state.user.coreConfig.theme
  return isThemeSetting(shared) ? shared : 'light'
}
