import {
  fireEvent,
  render,
  screen,
  waitFor
} from '@testing-library/react'
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
import { ContactRowActions } from './ContactRowActions'

jest.mock('@common/utils/calendarSpaUrl')
jest.mock('@common/utils/chatSpaUrl')
jest.mock('@common/utils/mailSpaUrl')

const contact: Contact = {
  id: 'c1',
  displayName: 'Jane Doe',
  emails: [{ type: 'work', value: 'jane.doe@example.com' }],
  socialProfiles: [{ type: 'matrix', value: 'jane' }]
} as Contact

const renderRowActions = (): void => {
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
          contacts: [contact]
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
