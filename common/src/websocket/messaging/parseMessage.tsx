import { AddressBookPush, parsePush } from './parsePush'
import { fetchUpdatedContacts } from '@common/features/Contacts/ContactsSlice'
import { AppDispatch } from '@common/app/store'

export const ADDRESSBOOK_PATH = /^\/addressbooks\/([^/]+)\/([^/]+)$/

export function parseMessage(message: unknown, dispatch: AppDispatch): void {
  const payload = parsePush(message)
  if (!payload) {
    console.info(message)
    return
  }

  for (const [path, push] of Object.entries(payload)) {
    const match = ADDRESSBOOK_PATH.exec(path)
    if (!match) {
      console.info({ [path]: push })
      continue
    }
    const [, userId, bookId] = match

    // Contact created/updated/deleted: refresh the already-loaded contacts
    handleBookUpdate({ push, dispatch, userId, bookId })

    // vCard import result
    handleImportNotification(push, userId, bookId)
  }
}

function handleImportNotification(
  push: AddressBookPush,
  userId: string,
  bookId: string
): void {
  if (typeof push.imports !== 'object' || push.imports === null) return

  for (const [importId, result] of Object.entries(push.imports)) {
    if (typeof result !== 'object' || result === null) continue
    console.info({
      userId,
      bookId,
      importId,
      status: result.status,
      succeedCount: result.succeedCount ?? 0,
      failedCount: result.failedCount ?? 0
    })
  }
}

function handleBookUpdate({
  push,
  dispatch,
  userId,
  bookId
}: {
  push: AddressBookPush
  dispatch: AppDispatch
  userId: string
  bookId: string
}): void {
  // A missing or malformed token would trigger an invalid refetch
  const newSyncToken = parseSyncToken(push.syncToken)
  if (newSyncToken === undefined) return

  void dispatch(fetchUpdatedContacts({ userId, bookId, newSyncToken }))
}

const WHOLE_NUMBER = /^\d+$/

// esn-sabre sync tokens are whole non-negative numbers
function parseSyncToken(syncToken: unknown): number | undefined {
  if (typeof syncToken !== 'number' && typeof syncToken !== 'string') {
    return undefined
  }
  if (!WHOLE_NUMBER.test(String(syncToken))) return undefined
  const token = Number(syncToken)
  return Number.isSafeInteger(token) ? token : undefined
}
