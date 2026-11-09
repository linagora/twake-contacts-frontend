import { parseMessage } from './parseMessage'
import { fetchUpdatedContacts } from '@common/features/Contacts/ContactsSlice'

vi.mock('@common/features/Contacts/ContactsSlice', () => ({
  fetchUpdatedContacts: vi.fn((args: unknown) => ({
    type: 'fetchUpdatedContacts',
    args
  }))
}))

describe('parseMessage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'info').mockImplementation(() => {})
  })

  it.each(['7', 7, '0', 0])('dispatches the push token %p', syncToken => {
    const dispatch = vi.fn()

    parseMessage({ '/addressbooks/u1/b1': { syncToken } }, dispatch as never)

    expect(dispatch).toHaveBeenCalledTimes(1)
    expect(fetchUpdatedContacts).toHaveBeenCalledWith({
      userId: 'u1',
      bookId: 'b1',
      newSyncToken: Number(syncToken)
    })
  })

  it.each([
    '7a',
    '1e3',
    '7.9',
    '-1',
    ' 7',
    '',
    1.5,
    -1,
    1e21,
    '99999999999999999999',
    null,
    true,
    undefined
  ])('ignores the push token %p', syncToken => {
    const dispatch = vi.fn()

    parseMessage({ '/addressbooks/u1/b1': { syncToken } }, dispatch as never)

    expect(dispatch).not.toHaveBeenCalled()
  })

  it('dispatches nothing for a message without any whole-number token', () => {
    const dispatch = vi.fn()

    parseMessage(
      {
        '/addressbooks/u1/b2': { syncToken: -1, imports: 'x' },
        '/addressbooks/u1/b1': 1
      },
      dispatch as never
    )

    expect(dispatch).not.toHaveBeenCalled()
  })
})
