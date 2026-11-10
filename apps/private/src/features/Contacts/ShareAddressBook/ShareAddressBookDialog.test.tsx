import type { Mock, MockedFunction } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'react-redux'
import { TwakeMuiThemeProvider } from '@linagora/twake-mui'
import I18n from 'twake-i18n'
import { setupStore } from '@common/app/store'
import {
  fetchAddressBookDetails,
  resolveAddressBookMember,
  updateAddressBookShares
} from '@common/features/Contacts/ContactsDao'
import { AddressBookAccessLevel } from '@common/features/Contacts/davTypes'
import { searchUsers } from '@common/features/User/UserDao'
import { UserState } from '@common/features/User/UserSlice'
import { userData } from '@common/features/User/userDataTypes'
import en from '@common/locales/en.json'
import { ShareAddressBookDialog } from './ShareAddressBookDialog'

vi.mock('@common/features/Contacts/ContactsDao')
vi.mock('@common/features/User/UserDao', () => ({
  searchUsers: vi.fn()
}))

const mockedFetchDetails = fetchAddressBookDetails as MockedFunction<
  typeof fetchAddressBookDetails
>
const mockedUpdateShares = updateAddressBookShares as MockedFunction<
  typeof updateAddressBookShares
>
const mockedResolveMember = resolveAddressBookMember as MockedFunction<
  typeof resolveAddressBookMember
>
const mockedSearchUsers = searchUsers as MockedFunction<typeof searchUsers>

const bob = {
  openpaasId: 'bob',
  name: 'bob bob',
  email: 'bob@open-paas.org',
  role: AddressBookAccessLevel.Viewer
} as userData

function renderDialog(onClose = vi.fn()): Mock {
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
          <ShareAddressBookDialog addressBookId="book1" onClose={onClose} />
        </I18n>
      </TwakeMuiThemeProvider>
    </Provider>
  )
  return onClose
}

describe('ShareAddressBookDialog', () => {
  beforeEach(() => {
    mockedResolveMember.mockImplementation(async m => m)
  })
  afterEach(() => vi.resetAllMocks())

  it('lists a member whose profile lookup has not answered yet', async () => {
    const invitedBob = { ...bob, name: bob.email }
    mockedFetchDetails.mockResolvedValue({
      members: [invitedBob],
      isPublic: false
    })
    mockedResolveMember.mockReturnValue(new Promise(() => undefined))
    renderDialog()

    expect(
      await screen.findByRole('button', { name: 'Role of bob@open-paas.org' })
    ).toBeInTheDocument()
    expect(
      screen.queryByText('No one has been added yet')
    ).not.toBeInTheDocument()
  })

  it('reports in the dialog a failure to fetch the members', async () => {
    mockedFetchDetails.mockRejectedValue(new Error('Bad Request'))
    renderDialog()

    expect(
      await screen.findByText('Failed to load the members of this address book')
    ).toBeInTheDocument()
    expect(
      screen.queryByText('No one has been added yet')
    ).not.toBeInTheDocument()
  })

  it('lists the members once they are fetched after a failure', async () => {
    const user = userEvent.setup()
    mockedFetchDetails
      .mockRejectedValueOnce(new Error('Bad Request'))
      .mockResolvedValue({ members: [bob], isPublic: false })
    mockedUpdateShares.mockResolvedValue(undefined)
    mockedSearchUsers.mockResolvedValue([
      {
        id: 'bob',
        firstname: 'bob',
        lastname: 'bob',
        emails: ['bob@open-paas.org']
      }
    ])
    renderDialog()

    expect(
      await screen.findByText('Failed to load the members of this address book')
    ).toBeInTheDocument()
    await user.type(screen.getByPlaceholderText('Add contacts'), 'bob')
    await waitFor(() => expect(mockedSearchUsers).toHaveBeenCalled())
    await user.click(await screen.findByText('bob@open-paas.org'))
    await user.click(screen.getByRole('button', { name: 'Send' }))

    expect(await screen.findByText('bob bob')).toBeInTheDocument()
    expect(
      screen.queryByText('Failed to load the members of this address book')
    ).not.toBeInTheDocument()
  })

  it('lists a member shared again right after being removed', async () => {
    const user = userEvent.setup()
    mockedFetchDetails
      .mockResolvedValueOnce({ members: [bob], isPublic: false })
      .mockResolvedValueOnce({ members: [], isPublic: false })
      .mockResolvedValueOnce({ members: [bob], isPublic: false })
    mockedUpdateShares.mockResolvedValue(undefined)
    mockedSearchUsers.mockResolvedValue([
      {
        id: 'bob',
        firstname: 'bob',
        lastname: 'bob',
        emails: ['bob@open-paas.org']
      }
    ])
    renderDialog()

    await user.click(await screen.findByRole('button', { name: 'Remove' }))
    await waitFor(() => expect(mockedFetchDetails).toHaveBeenCalledTimes(2))
    expect(screen.queryByText('bob bob')).not.toBeInTheDocument()

    await user.type(screen.getByPlaceholderText('Add contacts'), 'bob')
    await waitFor(() => expect(mockedSearchUsers).toHaveBeenCalled())
    await user.click(await screen.findByText('bob@open-paas.org'))
    await user.click(screen.getByRole('button', { name: 'Send' }))

    expect(await screen.findByText('bob bob')).toBeInTheDocument()
    expect(mockedFetchDetails).toHaveBeenCalledTimes(3)
  })

  it('keeps the focus on the role selector after a role change', async () => {
    const user = userEvent.setup()
    mockedFetchDetails.mockResolvedValue({ members: [bob], isPublic: false })
    let resolveUpdate: () => void = () => undefined
    mockedUpdateShares.mockReturnValue(
      new Promise<void>(resolve => {
        resolveUpdate = resolve
      })
    )
    const onClose = renderDialog()

    const selector = await screen.findByRole('button', {
      name: 'Role of bob bob'
    })
    await user.click(selector)
    await user.click(
      within(screen.getByRole('menu')).getByRole('menuitemradio', {
        name: 'Editor'
      })
    )

    await waitFor(() => expect(mockedUpdateShares).toHaveBeenCalled())
    await waitFor(() => expect(selector).toHaveFocus())
    expect(selector).toBeEnabled()
    expect(selector).toHaveAttribute('aria-disabled', 'true')
    resolveUpdate()
    await waitFor(() => expect(mockedFetchDetails).toHaveBeenCalledTimes(2))
    expect(selector).toHaveFocus()
    expect(selector).toHaveAttribute('aria-disabled', 'false')
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()

    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalled()
  })

  it('moves the focus to the "Add contacts" field after a removal', async () => {
    const user = userEvent.setup()
    mockedFetchDetails
      .mockResolvedValueOnce({ members: [bob], isPublic: false })
      .mockResolvedValue({ members: [], isPublic: false })
    mockedUpdateShares.mockResolvedValue(undefined)
    const onClose = renderDialog()

    const removeButton = await screen.findByRole('button', { name: 'Remove' })
    removeButton.focus()
    await user.click(removeButton)

    await waitFor(() => expect(mockedFetchDetails).toHaveBeenCalledTimes(2))
    expect(screen.queryByText('bob bob')).not.toBeInTheDocument()
    expect(screen.getByPlaceholderText('Add contacts')).toHaveFocus()

    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalled()
  })
})
