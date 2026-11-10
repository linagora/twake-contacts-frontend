import { useAppDispatch, useAppSelector } from '@common/app/hooks'
import {
  setThemeMode,
  type ThemeMode
} from '@common/features/Settings/SettingsSlice'
import { IconButton, Tooltip, useColorScheme } from '@linagora/twake-mui'
import DarkModeIcon from '@mui/icons-material/DarkMode'
import LightModeIcon from '@mui/icons-material/LightMode'
import { useI18n } from 'twake-i18n'

export const ThemeToggle: React.FC = () => {
  const { t } = useI18n()
  const dispatch = useAppDispatch()
  const { setMode } = useColorScheme()
  const themeMode = useAppSelector(state => state.settings.themeMode)

  const handleToggle = (): void => {
    const next: ThemeMode = themeMode === 'light' ? 'dark' : 'light'
    setMode(next)
    dispatch(setThemeMode(next))
  }

  const isDark = themeMode === 'dark'
  const label = isDark ? t('theme.lightMode') : t('theme.darkMode')

  return (
    <Tooltip title={label}>
      <IconButton onClick={handleToggle} aria-label={label}>
        {isDark ? <LightModeIcon /> : <DarkModeIcon />}
      </IconButton>
    </Tooltip>
  )
}
