import { useAppDispatch } from '@common/app/hooks'
import { setThemeOverride } from '@common/features/Settings/SettingsSlice'
import { useThemeMode } from '@common/features/Settings/useThemeMode'
import { Contrast, Icon } from '@linagora/twake-icons'
import { IconButton, Tooltip } from '@linagora/twake-mui'
import { useI18n } from 'twake-i18n'

/** A debug switch: the theme changes for this page only and is not stored */
export const ThemeToggle: React.FC = () => {
  const { t } = useI18n()
  const dispatch = useAppDispatch()
  const current = useThemeMode()

  const handleToggle = (): void => {
    dispatch(setThemeOverride(current === 'light' ? 'dark' : 'light'))
  }

  const label = current === 'dark' ? t('theme.lightMode') : t('theme.darkMode')

  return (
    <Tooltip title={label}>
      <IconButton onClick={handleToggle} aria-label={label}>
        <Icon icon={Contrast} />
      </IconButton>
    </Tooltip>
  )
}
