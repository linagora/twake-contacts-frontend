import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'react-redux'
import { TwakeMuiThemeProvider } from '@linagora/twake-mui'
import I18n from 'twake-i18n'
import { setupStore } from '@common/app/store'
import {
  fetchAddressBookDetails,
  updateAddressBookShares
} from '@common/features/Contacts/ContactsDao'
import { AddressBookAccessLevel } from '@common/features/Contacts/davTypes'
import { searchUsers } from '@common/features/User/UserDao'
import { UserState } from '@common/features/User/UserSlice'
import { userData } from '@common/features/User/userDataTypes'
import en from '@common/locales/en.json'
import { ShareAddressBookDialog } from './ShareAddressBookDialog'

jest.mock('@common/features/Contacts/ContactsDao')
jest.mock('@common/features/User/UserDao', () => ({
  searchUsers: jest.fn()
}))

const mockedFetchDetails = fetchAddressBookDetails as jest.MockedFunction<
  typeof fetchAddressBookDetails
>
const mockedUpdateShares = updateAddressBookShares as jest.MockedFunction<
  typeof updateAddressBookShares
>
const mockedSearchUsers = searchUsers as jest.MockedFunction<typeof searchUsers>

const bob = {
  openpaasId: 'bob',
  name: 'bob bob',
  email: 'bob@open-paas.org',
  role: AddressBookAccessLevel.Viewer
} as userData

describe('ShareAddressBookDialog', () => {
  it('lists a member shared again right after being removed', async () => {
    mockedFetchDetails
      .mockResolvedValueOnce([bob])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([bob])
    mockedUpdateShares.mockResolvedValue(undefined)
    mockedSearchUsers.mockResolvedValue([
      {
        id: 'bob',
        firstname: 'bob',
        lastname: 'bob',
        emails: ['bob@open-paas.org']
      }
    ])
    const store = setupStore({
      user: {
        userData: {
          openpaasId: 'alice',
          name: 'alice alice',
          email: 'alice@open-paas.org'
        }
      } as UserState,
      contacts: {
        addressBooks: {
          book1: {
            id: 'book1',
            userId: 'alice',
            name: 'Friends',
            contactsCount: 0,
            acl: [],
            canWrite: true,
            contacts: []
          }
        },
        listings: {},
        loading: false,
        error: null
      }
    })
    render(
      <Provider store={store}>
        <TwakeMuiThemeProvider>
          <I18n dictRequire={() => en} lang="en">
            <ShareAddressBookDialog addressBookId="book1" onClose={jest.fn()} />
          </I18n>
        </TwakeMuiThemeProvider>
      </Provider>
    )

    userEvent.click(await screen.findByRole('button', { name: 'Remove' }))
    await waitFor(() => expect(mockedFetchDetails).toHaveBeenCalledTimes(2))
    expect(screen.queryByText('bob bob')).not.toBeInTheDocument()

    userEvent.type(screen.getByPlaceholderText('Add contacts'), 'bob')
    await waitFor(() => expect(mockedSearchUsers).toHaveBeenCalled())
    userEvent.click(await screen.findByText('bob@open-paas.org'))
    userEvent.click(screen.getByRole('button', { name: 'Send' }))

    expect(await screen.findByText('bob bob')).toBeInTheDocument()
    expect(mockedFetchDetails).toHaveBeenCalledTimes(3)
  })
})
