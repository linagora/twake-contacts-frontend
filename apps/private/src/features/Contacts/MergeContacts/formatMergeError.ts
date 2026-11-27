import { MergeGroupError } from '@common/features/Contacts/hooks/useDuplicateContacts'
import { translateMergeConflictField } from '@common/locales/dynamicKeys'

export const formatMergeError = (
  error: MergeGroupError | null | undefined,
  t: (key: string, options?: Record<string, unknown>) => string
): string | null => {
  if (!error) return null
  if (error.reason === 'changed') return t('contacts.merge.changedError')
  if (error.reason === 'dismiss') return t('contacts.merge.dismissError')
  if (error.reason === 'audience') return t('contacts.merge.audienceError')
  if (error.reason === 'conflict') {
    if (error.conflictFields?.length) {
      const fields = error.conflictFields
        .map(field => translateMergeConflictField(field, t))
        .join(', ')
      return t('contacts.merge.conflictErrorWithFields', { fields })
    }
    return t('contacts.merge.conflictError')
  }
  return t('contacts.merge.mergeError')
}
