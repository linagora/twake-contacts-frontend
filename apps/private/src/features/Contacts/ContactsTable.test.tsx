import { act, fireEvent, render, screen } from '@testing-library/react'
import { Provider } from 'react-redux'
import { MemoryRouter, Route, Routes } from 'react-router'
import { VirtuosoMockContext } from '@linagora/twake-mui'
import I18n from 'twake-i18n'
import { setupStore } from '@common/app/store'
import { ContactEntry } from '@common/features/Contacts/contactsTypes'
import { UserState } from '@common/features/User/UserSlice'
import en from '@common/locales/en.json'
import { ContactsTable } from './ContactsTable'

const jane: ContactEntry = {
  addressBookId: 'book1',
  contact: {
    id: 'c1',
    displayName: 'Jane Smith',
    emails: [{ type: null, value: 'jane@example.com' }]
  }
}

const renderTable = (): ReturnType<typeof render> =>
  render(
    <Provider
      store={setupStore({
        user: { userData: { openpaasId: 'u1' } } as UserState
      })}
    >
      <I18n dictRequire={() => en} lang="en">
        <VirtuosoMockContext.Provider
          value={{ viewportHeight: 1000, itemHeight: 50 }}
        >
          <MemoryRouter initialEntries={['/contacts/book1']}>
            <Routes>
              <Route
                path="/contacts/:addressBookId"
                element={
                  <ContactsTable entries={[jane]} onEndReached={jest.fn()} />
                }
              />
              <Route
                path="/contacts/:addressBookId/:contactId"
                element={<div>contact page</div>}
              />
            </Routes>
          </MemoryRouter>
        </VirtuosoMockContext.Provider>
      </I18n>
    </Provider>
  )

describe('ContactsTable', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    window.MAIL_SPA_URL = 'https://mail.example.com'
  })

  afterEach(() => {
    jest.useRealTimers()
    delete window.MAIL_SPA_URL
  })

  const openNamePopover = (): void => {
    fireEvent.mouseEnter(screen.getByRole('button', { name: /Jane Smith/ }))
    act(() => {
      jest.advanceTimersByTime(1000)
    })
  }

  it('opens the contact when clicking its row', () => {
    renderTable()

    fireEvent.click(screen.getByText('jane@example.com'))

    expect(screen.getByText('contact page')).toBeInTheDocument()
  })

  it('does not open the contact when clicking outside its name popover', () => {
    renderTable()
    openNamePopover()

    const backdrop = document.querySelector('.MuiBackdrop-root')
    expect(backdrop).not.toBeNull()
    fireEvent.click(backdrop as Element)

    expect(screen.queryByText('contact page')).not.toBeInTheDocument()
  })
})
