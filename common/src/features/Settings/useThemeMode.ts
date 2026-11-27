import { useAppSelector } from '@common/app/hooks'
import { useColorScheme } from '@linagora/twake-mui'
import type { ThemeMode } from './SettingsSlice'
import { selectThemeSetting } from './themeSelectors'

/** The theme shown, with the shared `auto` resolved from the system */
export function useThemeMode(): ThemeMode {
  const theme = useAppSelector(selectThemeSetting)
  const { systemMode } = useColorScheme()
  return theme === 'auto' ? (systemMode ?? 'light') : theme
}
