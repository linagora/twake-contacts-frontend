import { classifyAddressBook } from '@common/features/Contacts/addressBookModel'
import { render, screen } from '@testing-library/react'
import { TwakeMuiThemeProvider } from '@linagora/twake-mui'
import I18n from 'twake-i18n'
import { AddressBook } from '@common/features/Contacts/contactsTypes'
import en from '@common/locales/en.json'
import ru from '@common/locales/ru.json'
import { AddressBookInfoCard } from './AddressBookInfoCard'

const dictionaries: Record<string, object> = { en, ru }

function renderCard(contactsCount: number | null, lang = 'en'): void {
  const book: AddressBook = classifyAddressBook(
    {
      id: 'book1',
      userId: 'u1',
      name: 'Zeta',
      contactsCount,
      acl: [],
      canWrite: true
    },
    'u1'
  )

  render(
    <TwakeMuiThemeProvider>
      <I18n dictRequire={() => dictionaries[lang]} lang={lang}>
        <AddressBookInfoCard book={book} />
      </I18n>
    </TwakeMuiThemeProvider>
  )
}

describe('AddressBookInfoCard', () => {
  it.each([
    [0, '0 contacts'],
    [1, '1 contact'],
    [2, '2 contacts']
  ])('displays %i contact(s) in English', (count, expected) => {
    renderCard(count)

    expect(screen.getByText(expected)).toBeInTheDocument()
  })

  it.each([
    [1, '1 контакт'],
    [2, '2 контакта'],
    [5, '5 контактов'],
    [21, '21 контакт']
  ])('displays %i contact(s) in Russian', (count, expected) => {
    renderCard(count, 'ru')

    expect(screen.getByText(expected)).toBeInTheDocument()
  })

  it('does not display the count when it is unknown', () => {
    renderCard(null)

    expect(screen.queryByText(/contact/)).not.toBeInTheDocument()
  })
})
