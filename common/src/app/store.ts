import contactsReducer from '@common/features/Contacts/ContactsSlice'
import settingsReducer from '@common/features/Settings/SettingsSlice'
import userReducer from '@common/features/User/UserSlice'
import { combineReducers, configureStore } from '@reduxjs/toolkit'
import loadingReducer from './loadingSlice'

const rootReducer = combineReducers({
  user: userReducer,
  contacts: contactsReducer,
  settings: settingsReducer,
  loading: loadingReducer
})

export const setupStore = (preloadedState?: Partial<RootState>) => {
  return configureStore({
    reducer: rootReducer,
    preloadedState
  })
}

export const store = setupStore()

export type RootState = ReturnType<typeof rootReducer>
export type AppStore = ReturnType<typeof setupStore>
export type AppDispatch = AppStore['dispatch']
