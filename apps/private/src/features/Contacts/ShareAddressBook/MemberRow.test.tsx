import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TwakeMuiThemeProvider } from '@linagora/twake-mui'
import I18n from 'twake-i18n'
import en from '@common/locales/en.json'
import { userData } from '@common/features/User/userDataTypes'
import { AddressBookAccessLevel } from '@common/features/Contacts/davTypes'
import { MemberRow } from './MemberRow'

const bob = (role: AddressBookAccessLevel): userData => ({
  email: 'bob@open-paas.org',
  family_name: 'bob',
  given_name: 'bob',
  name: 'bob bob',
  sid: '',
  sub: 'bob',
  openpaasId: 'bob',
  role
})

function renderMemberRow(
  member: userData,
  onUpdateMember = jest.fn()
): jest.Mock {
  render(
    <TwakeMuiThemeProvider>
      <I18n dictRequire={() => en} lang="en">
        <MemberRow member={member} onUpdateMember={onUpdateMember} />
      </I18n>
    </TwakeMuiThemeProvider>
  )
  return onUpdateMember
}

describe('MemberRow', () => {
  it('shows the role of a member with read-write access (dav:share-access 3)', () => {
    renderMemberRow(bob(AddressBookAccessLevel.ReadWrite))

    expect(screen.getByRole('combobox')).toHaveTextContent('Read & write')
  })

  it('changes a read-write member to Viewer', () => {
    const member = bob(AddressBookAccessLevel.ReadWrite)
    const onUpdateMember = renderMemberRow(member)

    userEvent.click(screen.getByRole('combobox'))
    userEvent.click(
      within(screen.getByRole('listbox')).getByRole('option', {
        name: 'Viewer'
      })
    )

    expect(onUpdateMember).toHaveBeenCalledWith(
      member,
      AddressBookAccessLevel.Viewer
    )
  })

  it('does not offer read-write to a Viewer', () => {
    renderMemberRow(bob(AddressBookAccessLevel.Viewer))

    userEvent.click(screen.getByRole('combobox'))

    expect(
      within(screen.getByRole('listbox'))
        .getAllByRole('option')
        .map(option => option.textContent)
    ).toEqual(['Viewer', 'Editor'])
  })
})
