import {
  fireEvent,
  render,
  screen,
  waitFor,
  within
} from '@testing-library/react'
import { Provider } from 'react-redux'
import { MemoryRouter } from 'react-router-dom'
import I18n from 'twake-i18n'
import { setupStore } from '@common/app/store'
import { deleteContact } from '@common/features/Contacts/ContactsDao'
import { UserState } from '@common/features/User/UserSlice'
import en from '@common/locales/en.json'
import { ContactActionsMenu } from './ContactActionsMenu'

jest.mock('@common/features/Contacts/ContactsDao')

describe('ContactActionsMenu', () => {
  it('deletes the contact after confirmation', async () => {
    const store = setupStore({
      user: { userData: { openpaasId: 'u1' } } as UserState,
      contacts: {
        addressBooks: {
          book1: {
            id: 'book1',
            userId: 'u1',
            name: 'Book 1',
            contactsCount: 1,
            acl: [],
            canWrite: true,
            contacts: [{ id: 'c1', displayName: 'Alice Roche', emails: [] }]
          }
        },
        loading: false,
        error: null
      }
    })
    const onDeleted = jest.fn()
    render(
      <Provider store={store}>
        <I18n dictRequire={() => en} lang="en">
          <MemoryRouter>
            <ContactActionsMenu
              contact={{ id: 'c1', displayName: 'Alice Roche', emails: [] }}
              addressBookId="book1"
              onDeleted={onDeleted}
            />
          </MemoryRouter>
        </I18n>
      </Provider>
    )

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    expect(screen.getByText('Delete this contact?')).toBeInTheDocument()
    fireEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' })
    )

    await waitFor(() => expect(onDeleted).toHaveBeenCalled())
    expect(deleteContact).toHaveBeenCalledWith('u1', 'book1', 'c1')
    expect(store.getState().contacts.addressBooks.book1.contacts).toEqual([])
  })
})
