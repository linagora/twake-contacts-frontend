import { config } from '@common/config'
import { createAppSlice } from '@common/app/createAppSlice'
import { PayloadAction } from '@reduxjs/toolkit'
import { type ContrastMode, readInitialContrastMode } from './contrastMode'

export type ThemeMode = 'light' | 'dark'

/** The `theme` of the `core` user configuration, shared by the Twake apps */
export type ThemeSetting = ThemeMode | 'auto'

export const isThemeSetting = (value: unknown): value is ThemeSetting =>
  value === 'light' || value === 'dark' || value === 'auto'

export interface SettingsState {
  language: string
  /** Set by the debug toggle, for this page only: never stored */
  themeOverride: ThemeMode | null
  /** Set by the debug toggle, for this page only: never stored */
  contrastMode: ContrastMode
}

const savedLang = localStorage.getItem('lang')
const defaultLang = savedLang ?? config.LANG

const initialState: SettingsState = {
  language: defaultLang,
  themeOverride: null,
  contrastMode: readInitialContrastMode()
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
      (state, action: PayloadAction<ThemeMode>) => {
        state.themeOverride = action.payload
      }
    ),
    setContrastMode: create.reducer(
      (state, action: PayloadAction<ContrastMode>) => {
        state.contrastMode = action.payload
      }
    )
  })
})

export type { ContrastMode }

export const { setLanguage, setThemeOverride, setContrastMode } =
  SettingsSlice.actions
export default SettingsSlice.reducer
