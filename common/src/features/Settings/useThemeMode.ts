import { useAppSelector } from '@common/app/hooks'
import { useColorScheme } from '@linagora/twake-mui'
import type { ThemeMode } from './SettingsSlice'
import { selectIsHighContrast, selectThemeSetting } from './themeSelectors'

/**
 * The theme shown, with the shared `auto` resolved from the system; the
 * twake-mui contrast scheme is a light one.
 */
export function useThemeMode(): ThemeMode {
  const theme = useAppSelector(selectThemeSetting)
  const isHighContrast = useAppSelector(selectIsHighContrast)
  const { systemMode } = useColorScheme()
  if (isHighContrast) return 'light'
  return theme === 'auto' ? (systemMode ?? 'light') : theme
}
