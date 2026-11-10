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
  | 'exportAddressBook'
  | 'exportContact'

export type ContactsOperationError = OperationError<ContactsOperation>

// keys are spelled out so that the translation key check sees them; copy and
// move share their message with the dialog that performs them
const OPERATION_KEYS: Readonly<Record<ContactsOperation, string>> = {
  load: 'contacts.errors.load',
  loadMembers: 'contacts.errors.loadMembers',
  create: 'contacts.errors.create',
  update: 'contacts.errors.update',
  delete: 'contacts.errors.delete',
  copy: 'contacts.copyContact.error',
  move: 'contacts.moveContact.error',
  share: 'contacts.errors.share',
  subscribe: 'contacts.errors.subscribe',
  deleteAddressBook: 'contacts.errors.deleteAddressBook',
  removeAddressBook: 'contacts.errors.removeAddressBook',
  exportAddressBook: 'contacts.errors.exportAddressBook',
  exportContact: 'contacts.errors.exportContact'
}

// reasons with a dedicated message, whatever the operation
const REASON_KEYS: Readonly<Partial<Record<OperationFailureReason, string>>> = {
  forbidden: 'contacts.errors.forbidden'
}

export function operationMessageKey(operation: ContactsOperation): string {
  return OPERATION_KEYS[operation]
}

export function messageKeyFor(error: ContactsOperationError): string {
  return REASON_KEYS[error.reason] ?? operationMessageKey(error.operation)
}
