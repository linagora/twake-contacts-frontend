import { DEFAULT_CONTACT_SORT } from '@common/features/Contacts/constants'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { Provider } from 'react-redux'
import { MemoryRouter } from 'react-router'
import { TwakeMuiThemeProvider } from '@linagora/twake-mui'
import I18n from 'twake-i18n'
import { setupStore } from '@common/app/store'
import { Contact } from '@common/features/Contacts/contactsTypes'
import { UserState } from '@common/features/User/UserSlice'
import en from '@common/locales/en.json'
import { openCalendarEvent } from '@common/utils/calendarSpaUrl'
import { openChat } from '@common/utils/chatSpaUrl'
import { openMailComposer } from '@common/utils/mailSpaUrl'
import { exportContact } from '@common/features/Contacts/ContactsDao'
import { downloadFile } from '@common/utils/downloadFile'
import { ContactRowActions } from './ContactRowActions'

vi.mock('@common/utils/calendarSpaUrl')
vi.mock('@common/utils/chatSpaUrl')
vi.mock('@common/utils/mailSpaUrl')
vi.mock('@common/features/Contacts/ContactsDao', async () => ({
  ...(await vi.importActual<
    typeof import('@common/features/Contacts/ContactsDao')
  >('@common/features/Contacts/ContactsDao')),
  exportContact: vi.fn()
}))
vi.mock('@common/utils/downloadFile', async () => ({
  ...(await vi.importActual<typeof import('@common/utils/downloadFile')>(
    '@common/utils/downloadFile'
  )),
  downloadFile: vi.fn()
}))

const contact: Contact = {
  id: 'c1',
  displayName: 'Jane Doe',
  emails: [{ type: 'work', value: 'jane.doe@example.com' }],
  socialProfiles: [{ type: 'matrix', value: 'jane' }]
}

const renderRowActions = (canWrite = true): void => {
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
          canWrite,
          contacts: [contact]
        }
      },
      listings: {},
      sort: DEFAULT_CONTACT_SORT,
      loading: false,
      error: null
    }
  })
  render(
    <Provider store={store}>
      <TwakeMuiThemeProvider>
        <I18n dictRequire={() => en} lang="en">
          <MemoryRouter>
            <ContactRowActions contact={contact} addressBookId="book1" />
          </MemoryRouter>
        </I18n>
      </TwakeMuiThemeProvider>
    </Provider>
  )
}

describe('ContactRowActions', () => {
  it.each([
    ['Send email', openMailComposer],
    ['Create event', openCalendarEvent],
    ['Open chat', openChat]
  ])('closes the menu after choosing "%s"', async (label, action) => {
    renderRowActions()

    fireEvent.click(screen.getByRole('button', { name: 'More actions' }))
    fireEvent.click(screen.getByRole('menuitem', { name: label }))

    expect(action).toHaveBeenCalled()
    await waitFor(() =>
      expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    )
  })
})

describe('ContactRowActions export', () => {
  const vcf = new Blob(['BEGIN:VCARD'], { type: 'text/vcard' })

  it('downloads the contact as a vCard named after it', async () => {
    vi.mocked(exportContact).mockResolvedValue(vcf)
    renderRowActions()

    fireEvent.click(screen.getByRole('button', { name: 'More actions' }))
    fireEvent.click(
      screen.getByRole('menuitem', { name: en.contacts.menu.export })
    )

    expect(exportContact).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'book1', userId: 'u1' }),
      'c1'
    )
    await waitFor(() =>
      expect(downloadFile).toHaveBeenCalledWith(vcf, 'Jane Doe.vcf')
    )
  })

  it('offers export on a read-only address book', () => {
    renderRowActions(false)

    fireEvent.click(screen.getByRole('button', { name: 'More actions' }))

    expect(
      screen.getByRole('menuitem', { name: en.contacts.menu.export })
    ).toBeInTheDocument()
  })

  it('reports a failed export', async () => {
    vi.mocked(exportContact).mockRejectedValue(new Error('500'))
    renderRowActions()

    fireEvent.click(screen.getByRole('button', { name: 'More actions' }))
    fireEvent.click(
      screen.getByRole('menuitem', { name: en.contacts.menu.export })
    )

    expect(
      await screen.findByText(en.contacts.errors.exportContact)
    ).toBeInTheDocument()
    expect(downloadFile).not.toHaveBeenCalled()
  })
})
