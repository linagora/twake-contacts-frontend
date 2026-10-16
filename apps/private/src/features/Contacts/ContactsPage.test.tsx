import { setupStore } from '@common/app/store'
import { DEFAULT_ADDRESS_BOOK_ID } from '@common/features/Contacts/constants'
import { UserState } from '@common/features/User/UserSlice'
import en from '@common/locales/en.json'
import fr from '@common/locales/fr.json'
import { TwakeMuiThemeProvider } from '@linagora/twake-mui'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { Provider } from 'react-redux'
import { MemoryRouter, Route, Routes } from 'react-router'
import I18n from 'twake-i18n'
import { ContactsPage } from './ContactsPage'

const failUpdate = (store: ReturnType<typeof setupStore>): void => {
  act(() => {
    store.dispatch({
      type: 'contacts/updateContact/rejected',
      payload: { status: 403 },
      error: {}
    })
  })
}

function renderPage(
  locale: { lang: string; dict: typeof en } = { lang: 'en', dict: en }
): ReturnType<typeof setupStore> {
  const store = setupStore({
    user: { userData: {} } as UserState,
    contacts: {
      addressBooks: {
        [DEFAULT_ADDRESS_BOOK_ID]: {
          id: DEFAULT_ADDRESS_BOOK_ID,
          userId: 'u1',
          name: 'My contacts',
          contactsCount: 0,
          acl: [],
          canWrite: true,
          contacts: []
        },
        book1: {
          id: 'book1',
          userId: 'u1',
          name: 'Book 1',
          contactsCount: 0,
          acl: [],
          canWrite: true,
          contacts: []
        }
      },
      loading: false,
      error: null
    }
  })

  render(
    <Provider store={store}>
      <TwakeMuiThemeProvider>
        <I18n dictRequire={() => locale.dict} lang={locale.lang}>
          <MemoryRouter initialEntries={['/contacts']}>
            <Routes>
              <Route path="/contacts" element={<ContactsPage />}>
                <Route index element={<div />} />
                <Route path=":addressBookId" element={<div />} />
              </Route>
            </Routes>
          </MemoryRouter>
        </I18n>
      </TwakeMuiThemeProvider>
    </Provider>
  )
  return store
}

describe('ContactsPage error banner', () => {
  it('clears the error when navigating to another page', () => {
    const store = renderPage()
    failUpdate(store)
    expect(screen.getByRole('alert')).toHaveTextContent(
      en.contacts.errors.forbidden
    )

    fireEvent.click(screen.getByText('Book 1'))

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(store.getState().contacts.error).toBeNull()
  })

  it('clears the error when the banner is closed', () => {
    const store = renderPage()
    failUpdate(store)

    fireEvent.click(screen.getByRole('button', { name: /close/i }))

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(store.getState().contacts.error).toBeNull()
  })

  it('labels the banner close button in the user language', () => {
    const store = renderPage({ lang: 'fr', dict: fr })
    failUpdate(store)

    expect(
      screen.getByRole('button', { name: fr.contacts.form.close })
    ).toBeInTheDocument()
  })
})
