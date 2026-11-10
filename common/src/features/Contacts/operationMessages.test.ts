import en from '@common/locales/en.json'
import { OperationFailureReason } from '@common/utils/errorUtils'
import {
  ContactsOperation,
  messageKeyFor,
  operationMessageKey
} from './operationMessages'

const OPERATIONS: ContactsOperation[] = [
  'load',
  'loadMembers',
  'create',
  'update',
  'delete',
  'copy',
  'move',
  'share',
  'subscribe',
  'deleteAddressBook',
  'removeAddressBook',
  'exportAddressBook',
  'exportContact'
]

const translate = (key: string): unknown =>
  key
    .split('.')
    .reduce<unknown>(
      (node, part) => (node as Record<string, unknown> | undefined)?.[part],
      en
    )

describe('operationMessageKey', () => {
  it.each(OPERATIONS)('maps "%s" to an existing message', operation => {
    expect(typeof translate(operationMessageKey(operation))).toBe('string')
  })

  it('shares the copy and move messages with their dialogs', () => {
    expect(operationMessageKey('copy')).toBe('contacts.copyContact.error')
    expect(operationMessageKey('move')).toBe('contacts.moveContact.error')
  })
})

describe('messageKeyFor', () => {
  it.each<OperationFailureReason>([
    'notFound',
    'conflict',
    'network',
    'unknown'
  ])('falls back to the operation message for %s', reason => {
    expect(messageKeyFor({ operation: 'delete', reason })).toBe(
      'contacts.errors.delete'
    )
  })

  it('uses the permission message when forbidden', () => {
    expect(
      messageKeyFor({ operation: 'move', reason: 'forbidden', status: 403 })
    ).toBe('contacts.errors.forbidden')
  })
})
