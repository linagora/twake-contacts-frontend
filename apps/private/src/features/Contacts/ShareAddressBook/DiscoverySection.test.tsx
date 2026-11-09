import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { Provider } from 'react-redux'
import { TwakeMuiThemeProvider } from '@linagora/twake-mui'
import I18n from 'twake-i18n'
import { setupStore } from '@common/app/store'
import {
  fetchAddressBookDetails,
  setAddressBookPublished
} from '@common/features/Contacts/ContactsDao'
import en from '@common/locales/en.json'
import { DiscoverySection } from './DiscoverySection'

vi.mock('@common/features/Contacts/ContactsDao')

function renderSection(isPublic?: boolean): void {
  const store = setupStore({
    contacts: {
      addressBooks: {
        book: {
          id: 'book',
          userId: 'owner',
          name: 'Book',
          contactsCount: 0,
          acl: [],
          canWrite: true,
          contacts: [],
          offset: 0,
          hasMore: false,
          isPublic
        }
      },
      loading: false,
      error: null
    }
  })
  render(
    <Provider store={store}>
      <TwakeMuiThemeProvider>
        <I18n dictRequire={() => en} lang="en">
          <DiscoverySection userId="owner" addressBookId="book" />
        </I18n>
      </TwakeMuiThemeProvider>
    </Provider>
  )
}

it('disables discovery while publication state is unknown', () => {
  renderSection()
  expect(screen.getByRole('switch')).toBeDisabled()
  expect(setAddressBookPublished).not.toHaveBeenCalled()
})

it('keeps discovery disabled until the publication refresh completes', async () => {
  vi.mocked(setAddressBookPublished).mockResolvedValue()
  let completeRefresh!: (value: { members: []; isPublic: boolean }) => void
  vi.mocked(fetchAddressBookDetails).mockReturnValue(
    new Promise(resolve => {
      completeRefresh = resolve
    })
  )
  renderSection(false)
  fireEvent.click(screen.getByRole('switch'))
  await waitFor(() =>
    expect(fetchAddressBookDetails).toHaveBeenCalledWith('owner', 'book')
  )
  expect(screen.getByRole('switch')).toBeDisabled()
  expect(setAddressBookPublished).toHaveBeenCalledWith('owner', 'book', true)
  await act(async () => {
    completeRefresh({ members: [], isPublic: true })
    await Promise.resolve()
  })
  expect(screen.getByRole('switch')).toBeEnabled()
  expect(screen.getByRole('switch')).toBeChecked()
})

it('preserves successful publication after refresh failure and allows unpublishing', async () => {
  vi.mocked(setAddressBookPublished).mockResolvedValue()
  vi.mocked(fetchAddressBookDetails).mockRejectedValue(
    new Error('Refresh failed')
  )
  renderSection(false)

  fireEvent.click(screen.getByRole('switch'))
  await waitFor(() => expect(screen.getByRole('switch')).toBeEnabled())
  expect(screen.getByRole('switch')).toBeChecked()

  fireEvent.click(screen.getByRole('switch'))
  await waitFor(() => expect(screen.getByRole('switch')).toBeEnabled())
  expect(setAddressBookPublished).toHaveBeenLastCalledWith(
    'owner',
    'book',
    false
  )
  expect(screen.getByRole('switch')).not.toBeChecked()
})

it('preserves the previous state when publication fails', async () => {
  vi.mocked(setAddressBookPublished).mockRejectedValue(
    new Error('Publish failed')
  )
  renderSection(false)

  fireEvent.click(screen.getByRole('switch'))
  await waitFor(() => expect(screen.getByRole('switch')).toBeEnabled())
  expect(screen.getByRole('switch')).not.toBeChecked()
  expect(fetchAddressBookDetails).not.toHaveBeenCalled()
})
