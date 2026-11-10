import type { Mock, MockedFunction } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TwakeMuiThemeProvider } from '@linagora/twake-mui'
import I18n from 'twake-i18n'
import en from '@common/locales/en.json'
import { searchUsers } from '@common/features/User/UserDao'
import { AddressBookAccessLevel } from '@common/features/Contacts/davTypes'
import { InviteSection } from './InviteSection'

vi.mock('@common/features/User/UserDao', () => ({
  searchUsers: vi.fn()
}))

const mockedSearchUsers = searchUsers as MockedFunction<typeof searchUsers>

function renderInviteSection(onShare = vi.fn()): Mock {
  render(
    <TwakeMuiThemeProvider>
      <I18n dictRequire={() => en} lang="en">
        <InviteSection currentUserId="alice" onShare={onShare} />
      </I18n>
    </TwakeMuiThemeProvider>
  )
  return onShare
}

describe('InviteSection', () => {
  beforeEach(() => {
    mockedSearchUsers.mockResolvedValue([
      {
        id: 'bob',
        firstname: 'bob',
        lastname: 'bob',
        emails: ['bob@open-paas.org']
      }
    ])
  })

  it('focuses the "Add contacts" field on mount', () => {
    renderInviteSection()

    expect(screen.getByPlaceholderText('Add contacts')).toHaveFocus()
  })

  it('names the role selector', () => {
    renderInviteSection()

    expect(screen.getByRole('button', { name: 'Role' })).toHaveTextContent(
      'Viewer'
    )
  })

  it('keeps the focus in the "Add contacts" field after Send', async () => {
    const user = userEvent.setup()
    const onShare = renderInviteSection()
    const input = screen.getByPlaceholderText('Add contacts')

    await user.type(input, 'bob')
    await user.click(await screen.findByText('bob@open-paas.org'))
    await user.click(screen.getByRole('button', { name: 'Send' }))

    expect(onShare).toHaveBeenCalledWith(
      [expect.objectContaining({ openpaasId: 'bob' })],
      AddressBookAccessLevel.Viewer
    )
    expect(input).toHaveFocus()
  })

  it('names the remove button of a picked person', async () => {
    const user = userEvent.setup()
    renderInviteSection()

    await user.type(screen.getByPlaceholderText('Add contacts'), 'bob')
    await user.click(await screen.findByText('bob@open-paas.org'))

    expect(
      screen.getAllByRole('button', { name: 'Remove bob bob' })
    ).toHaveLength(1)
  })

  it('removes the picked person and gives the focus back to the field', async () => {
    const user = userEvent.setup()
    const onShare = renderInviteSection()
    const input = screen.getByPlaceholderText('Add contacts')

    await user.type(input, 'bob')
    await user.click(await screen.findByText('bob@open-paas.org'))
    await user.click(screen.getByRole('button', { name: 'Remove bob bob' }))

    expect(
      screen.queryByRole('button', { name: 'Remove bob bob' })
    ).not.toBeInTheDocument()
    expect(input).toHaveFocus()
    expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled()
    expect(onShare).not.toHaveBeenCalled()
  })
})
