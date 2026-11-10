import { useAppDispatch, useAppSelector } from '@common/app/hooks'
import { setContrastMode } from '@common/features/Settings/SettingsSlice'
import { IconButton, Tooltip } from '@linagora/twake-mui'
import { Contrast, Icon } from '@linagora/twake-icons'
import { useI18n } from 'twake-i18n'

export const ContrastToggle: React.FC = () => {
  const { t } = useI18n()
  const dispatch = useAppDispatch()
  const isHighContrast = useAppSelector(
    state => state.settings.contrastMode === 'more'
  )
  const label = t('theme.highContrast')

  const handleToggle = (): void => {
    dispatch(setContrastMode(isHighContrast ? 'default' : 'more'))
  }

  return (
    <Tooltip title={label}>
      <IconButton
        onClick={handleToggle}
        aria-label={label}
        aria-pressed={isHighContrast}
      >
        <Icon icon={Contrast} aria-hidden />
      </IconButton>
    </Tooltip>
  )
}
