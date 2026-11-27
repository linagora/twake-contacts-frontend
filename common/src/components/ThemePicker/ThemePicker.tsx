import { useAppDispatch, useAppSelector } from '@common/app/hooks'
import { config } from '@common/config'
import {
  setThemeOverride,
  THEME_CHOICES,
  type ThemeChoice
} from '@common/features/Settings/SettingsSlice'
import { selectTheme } from '@common/features/Settings/themeSelectors'
import {
  Icon,
  Palette,
  RadioChecked,
  RadioUnchecked
} from '@linagora/twake-icons'
import {
  ActionsMenu,
  ActionsMenuItem,
  IconButton,
  ListItemIcon,
  ListItemText,
  Tooltip
} from '@linagora/twake-mui'
import { useId, useRef, useState } from 'react'
import { useI18n } from 'twake-i18n'

const THEME_LABEL_KEYS: Record<ThemeChoice, string> = {
  light: 'theme.light',
  dark: 'theme.dark',
  auto: 'theme.auto',
  contrast: 'theme.highContrast'
}

/**
 * Shown with THEME_PICKER or DEBUG: the theme changes for this page only and
 * is not stored
 */
export const ThemePicker: React.FC = () => {
  const { t } = useI18n()
  const anchorRef = useRef<HTMLButtonElement>(null)
  const menuId = useId()
  const [open, setOpen] = useState(false)
  const dispatch = useAppDispatch()
  const current = useAppSelector(selectTheme)
  const label = t('theme.title')

  if (!config.THEME_PICKER && !config.DEBUG) return null

  const handleChoose = (choice: ThemeChoice): void => {
    setOpen(false)
    dispatch(setThemeOverride(choice))
  }

  return (
    <>
      <Tooltip title={label}>
        <IconButton
          ref={anchorRef}
          aria-label={label}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-controls={open ? menuId : undefined}
          onClick={() => setOpen(true)}
        >
          <Icon icon={Palette} aria-hidden />
        </IconButton>
      </Tooltip>
      <ActionsMenu
        ref={anchorRef}
        id={menuId}
        open={open}
        onClose={() => setOpen(false)}
      >
        {THEME_CHOICES.map(choice => (
          <ActionsMenuItem
            key={choice}
            role="menuitemradio"
            aria-checked={current === choice}
            onClick={() => handleChoose(choice)}
          >
            <ListItemIcon>
              <Icon
                icon={current === choice ? RadioChecked : RadioUnchecked}
                color={current === choice ? 'primary' : 'inherit'}
              />
            </ListItemIcon>
            <ListItemText>{t(THEME_LABEL_KEYS[choice])}</ListItemText>
          </ActionsMenuItem>
        ))}
      </ActionsMenu>
    </>
  )
}
