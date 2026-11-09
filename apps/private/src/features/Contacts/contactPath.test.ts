import { matchRoutes } from 'react-router'
import { contactPath, editContactPath } from './contactPath'

const routes = [
  { path: '/contacts/:addressBookId/:contactId' },
  { path: '/contacts/:addressBookId/:contactId/edit' }
]

const paramsOf = (path: string): Record<string, string | undefined> =>
  matchRoutes(routes, path)?.[0]?.params ?? {}

describe('contactPath', () => {
  it('gives back the contact id in the route params', () => {
    expect(paramsOf(contactPath('book1', 'a/b %?#'))).toEqual({
      addressBookId: 'book1',
      contactId: 'a/b %?#'
    })
  })

  it('gives back the contact id in the edit route params', () => {
    expect(paramsOf(editContactPath('book1', 'a/b'))).toEqual({
      addressBookId: 'book1',
      contactId: 'a/b'
    })
  })
})
