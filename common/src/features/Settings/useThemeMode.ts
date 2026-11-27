import { useAppSelector } from '@common/app/hooks'
import { useColorScheme } from '@linagora/twake-mui'
import type { ThemeMode } from './SettingsSlice'
import { selectTheme } from './themeSelectors'

/**
 * The theme shown, with `auto` resolved from the system; the twake-mui
 * contrast scheme is a light one.
 */
export function useThemeMode(): ThemeMode {
  const theme = useAppSelector(selectTheme)
  const { systemMode } = useColorScheme()
  if (theme === 'contrast') return 'light'
  return theme === 'auto' ? (systemMode ?? 'light') : theme
}
