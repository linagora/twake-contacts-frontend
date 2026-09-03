import { createAppSlice } from '@common/app/createAppSlice'
import { PayloadAction } from '@reduxjs/toolkit'

export interface SettingsState {
  language: string
}

const savedLang = localStorage.getItem('lang')
const defaultLang = savedLang ?? window.LANG ?? 'en'

const SettingsSlice = createAppSlice({
  name: 'settings',
  initialState: {
    language: defaultLang
  } as SettingsState,
  reducers: create => ({
    setLanguage: create.reducer((state, action: PayloadAction<string>) => {
      state.language = action.payload
      localStorage.setItem('lang', action.payload)
    })
  })
})

export const { setLanguage } = SettingsSlice.actions
export default SettingsSlice.reducer
