import { config } from '@common/config'
import { createAppSlice } from '@common/app/createAppSlice'
import { PayloadAction } from '@reduxjs/toolkit'
import {
  type ContrastMode,
  persistContrastMode,
  readInitialContrastMode
} from './contrastMode'

export type ThemeMode = 'light' | 'dark'

export interface SettingsState {
  language: string
  themeMode: ThemeMode
  contrastMode: ContrastMode
}

const savedLang = localStorage.getItem('lang')
const defaultLang = savedLang ?? config.LANG
const savedTheme = localStorage.getItem('theme') as ThemeMode | null
const defaultTheme: ThemeMode = savedTheme ?? 'light'

const SettingsSlice = createAppSlice({
  name: 'settings',
  initialState: {
    language: defaultLang,
    themeMode: defaultTheme,
    contrastMode: readInitialContrastMode()
  },
  reducers: create => ({
    setLanguage: create.reducer((state, action: PayloadAction<string>) => {
      state.language = action.payload
      localStorage.setItem('lang', action.payload)
    }),
    setThemeMode: create.reducer((state, action: PayloadAction<ThemeMode>) => {
      state.themeMode = action.payload
      localStorage.setItem('theme', action.payload)
    }),
    setContrastMode: create.reducer(
      (state, action: PayloadAction<ContrastMode>) => {
        state.contrastMode = action.payload
        persistContrastMode(action.payload)
      }
    )
  })
})

export type { ContrastMode }

export const { setLanguage, setThemeMode, setContrastMode } =
  SettingsSlice.actions
export default SettingsSlice.reducer
