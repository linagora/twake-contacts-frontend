import { render, RenderResult, screen } from '@testing-library/react'
import { TwakeMuiThemeProvider } from '@linagora/twake-mui'
import I18n from 'twake-i18n'
import en from '@common/locales/en.json'
import { AddressBook } from '@common/features/Contacts/contactsTypes'
import { DeleteAddressBookDialog } from './DeleteAddressBookDialog'

const ownBook: AddressBook = {
  id: 'book1',
  userId: 'alice-id',
  name: 'Zulu',
  contactsCount: 0,
  acl: ['dav:read', 'dav:write'],
  canWrite: true
}

const renderDialog = (book: AddressBook): RenderResult =>
  render(
    <TwakeMuiThemeProvider>
      <I18n dictRequire={() => en} lang="en">
        <DeleteAddressBookDialog
          book={book}
          onClose={jest.fn()}
          onConfirm={jest.fn()}
        />
      </I18n>
    </TwakeMuiThemeProvider>
  )

const description = (key: string): string => key.replace('%{name}', 'Zulu')

describe('DeleteAddressBookDialog', () => {
  it('warns that the contacts are deleted for an own book', () => {
    renderDialog(ownBook)

    expect(
      screen.getByText(description(en.contacts.addressBook.deleteDescription))
    ).toBeInTheDocument()
  })

  it('tells the book can be found again by its owner for a public subscription', () => {
    renderDialog({
      ...ownBook,
      ownerId: 'bob-id',
      subscriptionType: 'public'
    })

    expect(
      screen.getByText(description(en.contacts.addressBook.removeDescription))
    ).toBeInTheDocument()
  })

  it('asks to have a delegated book shared again, it cannot be searched for', () => {
    renderDialog({
      ...ownBook,
      ownerId: 'bob-id',
      subscriptionType: 'delegation'
    })

    expect(
      screen.getByText(
        description(en.contacts.addressBook.removeDelegatedDescription)
      )
    ).toBeInTheDocument()
    expect(
      screen.queryByText(description(en.contacts.addressBook.removeDescription))
    ).not.toBeInTheDocument()
  })
})
