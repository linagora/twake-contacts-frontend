import { useAppSelector } from '@common/app/hooks'
import { useApplyColorScheme } from '@linagora/twake-mui'
import { useEffect } from 'react'
import { selectIsHighContrast, selectThemeSetting } from './themeSelectors'

/** High contrast is the twake-mui `contrast` scheme: it wins over the theme */
export function ThemeSync(): null {
  const applyColorScheme = useApplyColorScheme()
  const theme = useAppSelector(selectThemeSetting)
  const isHighContrast = useAppSelector(selectIsHighContrast)
  const scheme = isHighContrast ? 'contrast' : theme

  useEffect(() => {
    applyColorScheme(scheme)
  }, [scheme, applyColorScheme])

  return null
}
