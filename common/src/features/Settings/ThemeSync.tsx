import { useAppSelector } from '@common/app/hooks'
import { useColorScheme } from '@linagora/twake-mui'
import { useEffect } from 'react'
import { selectIsHighContrast, selectThemeSetting } from './themeSelectors'

/** The high-contrast scheme is light: it wins over the dark theme. */
export function ThemeSync(): null {
  const { mode, setMode } = useColorScheme()
  const theme = useAppSelector(selectThemeSetting)
  const isHighContrast = useAppSelector(selectIsHighContrast)
  const effectiveMode = isHighContrast
    ? 'light'
    : theme === 'auto'
      ? 'system'
      : theme

  useEffect(() => {
    if (mode !== effectiveMode) {
      setMode(effectiveMode)
    }
  }, [mode, effectiveMode, setMode])

  return null
}
