import { MergeGroupError } from '@common/features/Contacts/hooks/useDuplicateContacts'
import { translateMergeConflictField } from '@common/locales/dynamicKeys'

const SIMPLE_REASON_KEYS: Partial<Record<MergeGroupError['reason'], string>> = {
  changed: 'contacts.merge.changedError',
  dismiss: 'contacts.merge.dismissError',
  audience: 'contacts.merge.audienceError',
  audienceUnavailable: 'contacts.transfer.audienceUnavailable'
}

const formatConflictError = (
  conflictFields: string[] | undefined,
  t: (key: string, options?: Record<string, unknown>) => string
): string => {
  if (!conflictFields?.length) return t('contacts.merge.conflictError')
  const fields = conflictFields
    .map(field => translateMergeConflictField(field, t))
    .join(', ')
  return t('contacts.merge.conflictErrorWithFields', { fields })
}

export const formatMergeError = (
  error: MergeGroupError | null | undefined,
  t: (key: string, options?: Record<string, unknown>) => string
): string | null => {
  if (!error) return null
  if (error.reason === 'conflict') {
    return formatConflictError(error.conflictFields, t)
  }
  return t(SIMPLE_REASON_KEYS[error.reason] ?? 'contacts.merge.mergeError')
}
