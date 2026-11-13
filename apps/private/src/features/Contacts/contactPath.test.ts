import { matchRoutes } from 'react-router'
import {
  addressBookPath,
  createContactPath,
  contactPath,
  decodeRouteParam,
  editContactPath
} from './contactPath'

const routes = [
  { path: '/contacts/new/:addressBookId' },
  { path: '/contacts/:addressBookId' },
  { path: '/contacts/:addressBookId/:contactId' },
  { path: '/contacts/:addressBookId/:contactId/edit' }
]

const paramsOf = (path: string): Record<string, string | undefined> =>
  Object.fromEntries(
    Object.entries(matchRoutes(routes, path)?.[0]?.params ?? {}).map(
      ([name, value]) => [name, decodeRouteParam(value)]
    )
  )

describe('contactPath', () => {
  it('gives back the contact id in the route params', () => {
    expect(paramsOf(contactPath('book1', 'a/b %?#'))).toEqual({
      addressBookId: 'book1',
      contactId: 'a/b %?#'
    })
  })

  it.each(['a%2Fb', 'a%252Fb', '%41', 'a%b', '%'])(
    'gives back the contact id %s holding a literal percent sign',
    contactId => {
      for (const path of [
        contactPath('book1', contactId),
        editContactPath('book1', contactId)
      ]) {
        expect(paramsOf(path)).toEqual({ addressBookId: 'book1', contactId })
      }
    }
  )

  it('tells a contact id holding a literal %2F from one holding a /', () => {
    expect(paramsOf(contactPath('book1', 'a%2Fb')).contactId).not.toBe(
      paramsOf(contactPath('book1', 'a/b')).contactId
    )
  })

  it('gives back the contact id in the edit route params', () => {
    expect(paramsOf(editContactPath('book1', 'a/b'))).toEqual({
      addressBookId: 'book1',
      contactId: 'a/b'
    })
  })
})

describe('address book IDs in routes', () => {
  it.each([
    'My#Book',
    'team/book',
    'my book',
    '100%',
    'book?query',
    'book%23name',
    'team%2Fbook',
    'équipe/連絡先'
  ])(
    'preserves %s in book, creation, contact and edit routes',
    addressBookId => {
      const contactId = 'card/with %?#'
      for (const path of [
        addressBookPath(addressBookId),
        createContactPath(addressBookId)
      ]) {
        expect(paramsOf(path)).toEqual({ addressBookId })
        const url = new URL(path, 'https://contacts.test')
        expect(url.hash).toBe('')
        expect(url.search).toBe('')
      }
      for (const path of [
        contactPath(addressBookId, contactId),
        editContactPath(addressBookId, contactId)
      ]) {
        expect(paramsOf(path)).toEqual({ addressBookId, contactId })
      }
    }
  )

  it('creates a contact without a preselected book', () => {
    expect(createContactPath()).toBe('/contacts/new')
  })
})
