import { config } from '@common/config'
import { createAppSlice } from '@common/app/createAppSlice'
import { PayloadAction } from '@reduxjs/toolkit'
import { prefersMoreContrast } from './systemContrast'

export type ThemeMode = 'light' | 'dark'

/** The `theme` of the `core` user configuration, shared by the Twake apps */
export type ThemeSetting = ThemeMode | 'auto'

export const isThemeSetting = (value: unknown): value is ThemeSetting =>
  value === 'light' || value === 'dark' || value === 'auto'

/** The twake-mui schemes: the shared themes, and the high contrast */
export const THEME_CHOICES = ['light', 'dark', 'auto', 'contrast'] as const

export type ThemeChoice = (typeof THEME_CHOICES)[number]

export interface SettingsState {
  language: string
  /** Set by the theme picker, for this page only: never stored */
  themeOverride: ThemeChoice | null
}

const savedLang = localStorage.getItem('lang')
const defaultLang = savedLang ?? config.LANG

const initialState: SettingsState = {
  language: defaultLang,
  // The OS asking for more contrast opens the page in the contrast scheme
  themeOverride: prefersMoreContrast() ? 'contrast' : null
}

const SettingsSlice = createAppSlice({
  name: 'settings',
  initialState,
  reducers: create => ({
    setLanguage: create.reducer((state, action: PayloadAction<string>) => {
      state.language = action.payload
      localStorage.setItem('lang', action.payload)
    }),
    setThemeOverride: create.reducer(
      (state, action: PayloadAction<ThemeChoice | null>) => {
        state.themeOverride = action.payload
      }
    )
  })
})

export const { setLanguage, setThemeOverride } = SettingsSlice.actions
export default SettingsSlice.reducer
