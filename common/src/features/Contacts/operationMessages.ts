import {
  OperationError,
  OperationFailureReason
} from '@common/utils/errorUtils'

export type ContactsOperation =
  | 'load'
  | 'loadMembers'
  | 'create'
  | 'update'
  | 'delete'
  | 'copy'
  | 'move'
  | 'share'
  | 'subscribe'
  | 'deleteAddressBook'
  | 'removeAddressBook'
  | 'updateAddressBook'
  | 'exportAddressBook'
  | 'exportContact'

export type ContactsOperationError = OperationError<ContactsOperation>

// operations whose message lives outside contacts.errors, shared with the
// dialog that performs them
const OPERATION_KEY_OVERRIDES: Readonly<
  Partial<Record<ContactsOperation, string>>
> = {
  copy: 'contacts.copyContact.error',
  move: 'contacts.moveContact.error'
}

// reasons with a dedicated message, whatever the operation
const REASON_KEYS: Readonly<Partial<Record<OperationFailureReason, string>>> = {
  forbidden: 'contacts.errors.forbidden'
}

export function operationMessageKey(operation: ContactsOperation): string {
  return OPERATION_KEY_OVERRIDES[operation] ?? `contacts.errors.${operation}`
}

export function messageKeyFor(error: ContactsOperationError): string {
  return REASON_KEYS[error.reason] ?? operationMessageKey(error.operation)
}
