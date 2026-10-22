import { createAppSlice } from '@common/app/createAppSlice'
import { PayloadAction } from '@reduxjs/toolkit'

export type ThemeMode = 'light' | 'dark'

export interface SettingsState {
  language: string
  themeMode: ThemeMode
}

const savedLang = localStorage.getItem('lang')
const defaultLang = savedLang ?? window.LANG ?? 'en'
const savedTheme = localStorage.getItem('theme') as ThemeMode | null
const defaultTheme: ThemeMode = savedTheme ?? 'light'

const SettingsSlice = createAppSlice({
  name: 'settings',
  initialState: {
    language: defaultLang,
    themeMode: defaultTheme
  },
  reducers: create => ({
    setLanguage: create.reducer((state, action: PayloadAction<string>) => {
      state.language = action.payload
      localStorage.setItem('lang', action.payload)
    }),
    setThemeMode: create.reducer((state, action: PayloadAction<ThemeMode>) => {
      state.themeMode = action.payload
      localStorage.setItem('theme', action.payload)
    })
  })
})

export const { setLanguage, setThemeMode } = SettingsSlice.actions
export default SettingsSlice.reducer
