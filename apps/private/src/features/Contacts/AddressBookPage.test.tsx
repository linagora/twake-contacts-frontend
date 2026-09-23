import { render, screen } from '@testing-library/react'
import { Provider } from 'react-redux'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { VirtuosoMockContext } from '@linagora/twake-mui'
import I18n from 'twake-i18n'
import { setupStore } from '@common/app/store'
import { fetchContactsForBook } from '@common/features/Contacts/ContactsDao'
import {
  AddressBookWithContacts,
  Contact
} from '@common/features/Contacts/contactsTypes'
import { UserState } from '@common/features/User/UserSlice'
import en from '@common/locales/en.json'
import { AddressBookPage } from './AddressBookPage'

jest.mock('@common/features/Contacts/ContactsDao')

const alice: Contact = { id: 'c1', displayName: 'Alice Roche', emails: [] }
const bob: Contact = { id: 'c2', displayName: 'Bob Martin', emails: [] }

const makeBook = (
  id: string,
  contacts: Contact[],
  hasMore: boolean
): AddressBookWithContacts => ({
  id,
  userId: 'u1',
  name: id,
  contactsCount: contacts.length + (hasMore ? 1 : 0),
  acl: [],
  canWrite: true,
  contacts,
  offset: contacts.length,
  hasMore
})

const renderPage = (
  path: string,
  addressBooks: Record<string, AddressBookWithContacts>
): ReturnType<typeof render> =>
  render(
    <Provider
      store={setupStore({
        user: { userData: { openpaasId: 'u1' } } as UserState,
        contacts: { addressBooks, loading: false, error: null }
      })}
    >
      <I18n dictRequire={() => en} lang="en">
        <VirtuosoMockContext.Provider
          value={{ viewportHeight: 1000, itemHeight: 50 }}
        >
          <MemoryRouter initialEntries={[path]}>
            <Routes>
              <Route path="/contacts" element={<AddressBookPage />} />
              <Route
                path="/contacts/:addressBookId"
                element={<AddressBookPage />}
              />
            </Routes>
          </MemoryRouter>
        </VirtuosoMockContext.Provider>
      </I18n>
    </Provider>
  )

describe('AddressBookPage lazy loading', () => {
  beforeEach(() => {
    jest
      .mocked(fetchContactsForBook)
      .mockResolvedValue({ contacts: [bob], hasMore: false })
  })

  it('loads the next page when the end of the list is reached', async () => {
    renderPage('/contacts/book1', { book1: makeBook('book1', [alice], true) })

    expect(await screen.findByText('Bob Martin')).toBeInTheDocument()
    expect(fetchContactsForBook).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'book1' }),
      'u1',
      50,
      1
    )
  })

  it('loads the first page of a book with no loaded contacts', async () => {
    renderPage('/contacts/book2', {
      book1: makeBook('book1', [alice], false),
      book2: makeBook('book2', [], true)
    })

    expect(await screen.findByText('Bob Martin')).toBeInTheDocument()
    expect(screen.queryByText('Alice Roche')).toBe(null)
  })

  it('loads the next book with more contacts on My contacts', async () => {
    renderPage('/contacts', {
      book1: makeBook('book1', [alice], false),
      book2: makeBook('book2', [], true)
    })

    expect(await screen.findByText('Bob Martin')).toBeInTheDocument()
    expect(fetchContactsForBook).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'book2' }),
      'u1',
      50,
      0
    )
  })
})
