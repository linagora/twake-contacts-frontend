import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { Provider } from 'react-redux'
import { MemoryRouter } from 'react-router-dom'
import { TwakeMuiThemeProvider } from '@linagora/twake-mui'
import I18n from 'twake-i18n'
import { setupStore } from '@common/app/store'
import {
  importContacts,
  uploadImportFile
} from '@common/features/Contacts/ContactsDao'
import { UserState } from '@common/features/User/UserSlice'
import en from '@common/locales/en.json'
import { ImportContactsButton } from './ImportContactsButton'

jest.mock('@common/features/Contacts/ContactsDao')

const mockUploadImportFile = uploadImportFile as jest.MockedFunction<
  typeof uploadImportFile
>
const mockImportContacts = importContacts as jest.MockedFunction<
  typeof importContacts
>

const defaultPreloadedState = {
  user: { userData: { openpaasId: 'u1' } } as UserState,
  contacts: {
    addressBooks: {
      contacts: {
        id: 'contacts',
        userId: 'u1',
        name: 'My contacts',
        contactsCount: 0,
        acl: [],
        canWrite: true,
        contacts: [],
        offset: 0,
        hasMore: false
      },
      book1: {
        id: 'book1',
        userId: 'u1',
        name: 'Book 1',
        contactsCount: 0,
        acl: [],
        canWrite: true,
        contacts: [],
        offset: 0,
        hasMore: false
      }
    },
    loading: false,
    error: null
  }
}

const renderWithProviders = (
  ui: React.ReactElement,
  preloadedState = defaultPreloadedState
) => {
  const store = setupStore(preloadedState)
  return {
    store,
    ...render(
      <Provider store={store}>
        <TwakeMuiThemeProvider>
          <I18n dictRequire={() => en} lang="en">
            <MemoryRouter>{ui}</MemoryRouter>
          </I18n>
        </TwakeMuiThemeProvider>
      </Provider>
    )
  }
}

const renderButton = (addressBookId?: string) =>
  renderWithProviders(<ImportContactsButton addressBookId={addressBookId} />)

const selectFile = (container: HTMLElement): void => {
  const file = new File(['vcard content'], 'contacts.vcf', {
    type: 'text/vcard'
  })
  const input = container.querySelector(
    'input[type="file"]'
  ) as HTMLInputElement
  fireEvent.change(input, { target: { files: [file] } })
}

describe('ImportContactsButton', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  const originalConsoleError = console.error
  beforeAll(() => {
    console.error = jest.fn()
  })
  afterAll(() => {
    console.error = originalConsoleError
  })

  it('renders the import button', () => {
    renderButton('book1')
    expect(screen.getByRole('button', { name: 'Import' })).toBeInTheDocument()
  })

  it('does not render when "contacts" address book is not available', () => {
    renderWithProviders(<ImportContactsButton />, {
      user: { userData: { openpaasId: 'u1' } } as UserState,
      contacts: {
        addressBooks: {
          book1: {
            id: 'book1',
            userId: 'u1',
            name: 'Book 1',
            contactsCount: 0,
            acl: [],
            canWrite: true,
            contacts: [],
            offset: 0,
            hasMore: false
          }
        },
        loading: false,
        error: null
      }
    })

    expect(
      screen.queryByRole('button', { name: 'Import' })
    ).not.toBeInTheDocument()
  })

  it('uploads file and starts import when file is selected', async () => {
    mockUploadImportFile.mockResolvedValue('file123')
    mockImportContacts.mockResolvedValue(undefined)

    const { container } = renderButton('book1')
    selectFile(container)

    await waitFor(() => {
      expect(mockUploadImportFile).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'contacts.vcf' })
      )
    })
    await waitFor(() => {
      expect(mockImportContacts).toHaveBeenCalledWith(
        'file123',
        '/addressbooks/u1/book1.json'
      )
    })
  })

  it('shows success snackbar after upload', async () => {
    mockUploadImportFile.mockResolvedValue('file123')
    mockImportContacts.mockResolvedValue(undefined)

    const { container } = renderButton('book1')
    selectFile(container)

    await waitFor(() => {
      expect(
        screen.getByText(
          "Import in progress. You'll receive an email when it's complete."
        )
      ).toBeInTheDocument()
    })
  })

  it('shows error snackbar when upload fails', async () => {
    mockUploadImportFile.mockRejectedValue(new Error('Upload failed'))

    const { container } = renderButton('book1')
    selectFile(container)

    await waitFor(() => {
      expect(screen.getByText('An unknown error occurred')).toBeInTheDocument()
    })
  })

  it('shows error snackbar when import fails', async () => {
    mockUploadImportFile.mockResolvedValue('file123')
    mockImportContacts.mockRejectedValue(new Error('Import failed'))

    const { container } = renderButton('book1')
    selectFile(container)

    await waitFor(() => {
      expect(screen.getByText('An unknown error occurred')).toBeInTheDocument()
    })
  })

  it('uses "contacts" address book when addressBookId is not provided', async () => {
    mockUploadImportFile.mockResolvedValue('file123')
    mockImportContacts.mockResolvedValue(undefined)

    const { container } = renderButton()
    selectFile(container)

    await waitFor(() => {
      expect(mockImportContacts).toHaveBeenCalledWith(
        'file123',
        '/addressbooks/u1/contacts.json'
      )
    })
  })

  it('does not render for non-writable address books', () => {
    renderWithProviders(<ImportContactsButton addressBookId="readonlyBook" />, {
      user: { userData: { openpaasId: 'u1' } } as UserState,
      contacts: {
        addressBooks: {
          readonlyBook: {
            id: 'readonlyBook',
            userId: 'u1',
            name: 'Read Only Book',
            contactsCount: 0,
            acl: [],
            canWrite: false,
            contacts: [],
            offset: 0,
            hasMore: false
          }
        },
        loading: false,
        error: null
      }
    })

    expect(
      screen.queryByRole('button', { name: 'Import' })
    ).not.toBeInTheDocument()
  })

  it('does not render for domain address book (dab)', () => {
    renderWithProviders(<ImportContactsButton addressBookId="dab" />, {
      user: { userData: { openpaasId: 'u1' } } as UserState,
      contacts: {
        addressBooks: {
          dab: {
            id: 'dab',
            userId: 'domain1',
            name: 'Domain Address Book',
            contactsCount: 0,
            acl: [],
            canWrite: true,
            contacts: [],
            offset: 0,
            hasMore: false
          }
        },
        loading: false,
        error: null
      }
    })

    expect(
      screen.queryByRole('button', { name: 'Import' })
    ).not.toBeInTheDocument()
  })
})
