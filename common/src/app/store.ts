import contactsReducer from '@common/features/Contacts/ContactsSlice'
import settingsReducer from '@common/features/Settings/SettingsSlice'
import userReducer from '@common/features/User/UserSlice'
import { combineReducers, configureStore } from '@reduxjs/toolkit'
import loadingReducer from './loadingSlice'
import { createBrowserHistory } from 'history'
import { createReduxHistoryContext } from 'redux-first-history'

const { createReduxHistory, routerMiddleware, routerReducer } =
  createReduxHistoryContext({ history: createBrowserHistory() })

const rootReducer = combineReducers({
  router: routerReducer,
  user: userReducer,
  contacts: contactsReducer,
  settings: settingsReducer,
  loading: loadingReducer
})

export const setupStore = (preloadedState?: Partial<RootState>) => {
  return configureStore({
    reducer: rootReducer,
    preloadedState,
    middleware: getDefaultMiddleware =>
      getDefaultMiddleware().concat(routerMiddleware)
  })
}

export const store = setupStore()

export const history = createReduxHistory(store)

export type RootState = ReturnType<typeof rootReducer>
export type AppStore = ReturnType<typeof setupStore>
export type AppDispatch = AppStore['dispatch']
