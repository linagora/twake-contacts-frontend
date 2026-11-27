import { useAppSelector } from '@common/app/hooks'
import { useApplyColorScheme } from '@linagora/twake-mui'
import { useEffect } from 'react'
import { selectTheme } from './themeSelectors'

/** Applies the theme as the twake-mui scheme */
export function ThemeSync(): null {
  const applyColorScheme = useApplyColorScheme()
  const theme = useAppSelector(selectTheme)

  useEffect(() => {
    applyColorScheme(theme)
  }, [theme, applyColorScheme])

  return null
}
