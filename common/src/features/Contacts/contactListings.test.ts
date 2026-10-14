import { compareContacts } from './contactListings'
import { Contact } from './contactsTypes'

const makeContact = (displayName: string): Contact => ({
  id: displayName,
  displayName,
  emails: []
})

const sortNames = (names: string[]): string[] =>
  names
    .map(makeContact)
    .sort(compareContacts)
    .map(contact => contact.displayName)

describe('compareContacts', () => {
  it('sorts by full name, ignoring case and accents like the server', () => {
    expect(
      sortNames(['Imp Alphab', 'émile Zola', 'Abel Second', 'aaron Analyse'])
    ).toEqual(['aaron Analyse', 'Abel Second', 'émile Zola', 'Imp Alphab'])
  })

  it('puts a name not starting with a letter first', () => {
    expect(sortNames(['Aaron Analyse', '42 Street'])).toEqual([
      '42 Street',
      'Aaron Analyse'
    ])
  })
})
