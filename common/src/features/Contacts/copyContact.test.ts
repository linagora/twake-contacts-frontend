/** @vitest-environment jsdom */
import { api } from '@common/utils/apiUtils'
import { copyContact, moveContact } from './ContactsDao'

vi.mock('@common/utils/apiUtils', () => ({ api: vi.fn() }))

it('sends COPY through the proxy with a Sabre-relative destination', async () => {
  window.SIDE_SERVICE_BASE_URL = 'https://contacts.example.com/services/'
  vi.mocked(api).mockResolvedValue({} as Response)
  const destinationContactId = await copyContact(
    { userId: 'source-user', addressBookId: 'source' },
    { userId: 'target-user', addressBookId: 'target' },
    'card id'
  )
  expect(destinationContactId).toMatch(/^[0-9a-f-]{36}$/)
  expect(destinationContactId).not.toBe('card id')
  expect(api).toHaveBeenCalledWith(
    'dav/addressbooks/source-user/source/card%20id.vcf',
    {
      method: 'COPY',
      headers: {
        Accept: 'application/json, text/plain, */*',
        'Content-Type': 'application/json;charset=UTF-8',
        Destination: `/addressbooks/target-user/target/${destinationContactId}.vcf`,
        Overwrite: 'F'
      }
    }
  )
})

it('sends MOVE through the proxy with a Sabre-relative destination and original UID', async () => {
  window.SIDE_SERVICE_BASE_URL = 'https://contacts.example.com/services/'
  vi.mocked(api)
    .mockClear()
    .mockResolvedValue({} as Response)
  await moveContact(
    { userId: 'source-user', addressBookId: 'source' },
    { userId: 'target-user', addressBookId: 'target' },
    'card id'
  )
  expect(api).toHaveBeenCalledTimes(1)
  expect(api).toHaveBeenCalledWith(
    'dav/addressbooks/source-user/source/card%20id.vcf',
    {
      method: 'MOVE',
      headers: {
        Accept: 'application/json, text/plain, */*',
        'Content-Type': 'application/json;charset=UTF-8',
        Destination: '/addressbooks/target-user/target/card%20id.vcf',
        Overwrite: 'F'
      }
    }
  )
})
