import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack
} from '@linagora/twake-mui'
import { useI18n } from 'twake-i18n'
import { MergeGroupError } from '@common/features/Contacts/hooks/useDuplicateContacts'
import { AddressBookWithContacts } from '@common/features/Contacts/contactsTypes'
import { getAddressBookDisplayName } from '@common/features/Contacts/contactsUtils'
import { DuplicateContactGroup } from '@common/features/Contacts/mergeContactsTypes'
import {
  DuplicateMatchField,
  TransferMergeAudienceBlock
} from '@common/features/Contacts/mergeContactsUtils'
import { DuplicateGroupCard } from './MergeContacts/DuplicateGroupCard'
import { formatMergeError } from './MergeContacts/formatMergeError'

interface DuplicateTransferDialogProps {
  mode: 'copy' | 'move'
  destination: AddressBookWithContacts
  duplicateGroup: DuplicateContactGroup
  matchedFields: DuplicateMatchField[]
  transferring: boolean
  errorMessage: string | null
  mergeError: MergeGroupError | null
  mergeAudienceBlock: TransferMergeAudienceBlock | null
  onBack: () => void
  onClose: () => void
  onConfirmWithoutMerge: () => void
  onConfirmMerge: () => void
}

const MODE_KEYS = {
  copy: {
    alert: 'contacts.transfer.duplicateCopyAlert',
    withoutMerge: 'contacts.transfer.copyWithoutMerge',
    anyway: 'contacts.transfer.copyAnyway'
  },
  move: {
    alert: 'contacts.transfer.duplicateMoveAlert',
    withoutMerge: 'contacts.transfer.moveWithoutMerge',
    anyway: 'contacts.transfer.moveAnyway'
  }
} as const

const MATCH_FIELD_KEYS: Record<DuplicateMatchField, string> = {
  name: 'contacts.transfer.matchFields.name',
  phone: 'contacts.transfer.matchFields.phone',
  email: 'contacts.transfer.matchFields.email',
  matrixId: 'contacts.transfer.matchFields.matrixId'
}

const formatAudienceMessage = (
  matchedFields: DuplicateMatchField[],
  t: ReturnType<typeof useI18n>['t']
): string => {
  const effectiveFields: readonly DuplicateMatchField[] = matchedFields.length
    ? matchedFields
    : ['name']
  const fields = effectiveFields
    .map(field => t(MATCH_FIELD_KEYS[field]))
    .join(', ')
  return t('contacts.transfer.audienceError', { fields })
}

interface DuplicateTransferActionsProps {
  audienceBlocked: boolean
  transferring: boolean
  withoutMergeLabel: string
  onBack: () => void
  onConfirmWithoutMerge: () => void
  onConfirmMerge: () => void
}

const DuplicateTransferActions: React.FC<DuplicateTransferActionsProps> = ({
  audienceBlocked,
  transferring,
  withoutMergeLabel,
  onBack,
  onConfirmWithoutMerge,
  onConfirmMerge
}) => {
  const { t } = useI18n()
  if (audienceBlocked) {
    return (
      <Stack direction="row" spacing={1}>
        <Button variant="text" onClick={onBack} disabled={transferring}>
          {t('contacts.form.cancel')}
        </Button>
        <Button
          variant="contained"
          loading={transferring}
          disabled={transferring}
          onClick={onConfirmWithoutMerge}
        >
          {withoutMergeLabel}
        </Button>
      </Stack>
    )
  }

  return (
    <Stack direction="row" className="u-w-100 u-flex-justify-between">
      <Button variant="text" onClick={onBack} disabled={transferring}>
        {t('contacts.form.cancel')}
      </Button>
      <Stack direction="row" spacing={1}>
        <Button
          variant="ghost"
          disabled={transferring}
          onClick={onConfirmWithoutMerge}
        >
          {withoutMergeLabel}
        </Button>
        <Button
          variant="contained"
          loading={transferring}
          disabled={transferring}
          onClick={onConfirmMerge}
        >
          {t('contacts.merge.merge')}
        </Button>
      </Stack>
    </Stack>
  )
}

export const DuplicateTransferDialog: React.FC<
  DuplicateTransferDialogProps
> = ({
  mode,
  destination,
  duplicateGroup,
  matchedFields,
  transferring,
  errorMessage,
  mergeError,
  mergeAudienceBlock,
  onBack,
  onClose,
  onConfirmWithoutMerge,
  onConfirmMerge
}) => {
  const { t } = useI18n()
  const keys = MODE_KEYS[mode]
  const mergeErrorMessage =
    mergeAudienceBlock === 'audience'
      ? formatAudienceMessage(matchedFields, t)
      : formatMergeError(
          mergeAudienceBlock ? { reason: mergeAudienceBlock } : mergeError,
          t
        )

  return (
    <Dialog
      open
      fullWidth
      size="large"
      onClose={transferring ? undefined : onClose}
      aria-labelledby={`${mode}-contact-duplicate-title`}
      onClick={event => event.stopPropagation()}
    >
      <DialogTitle id={`${mode}-contact-duplicate-title`}>
        {t('contacts.transfer.duplicateTitle')}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          {!mergeAudienceBlock && (
            <Alert severity="info">
              {t(keys.alert, {
                book: getAddressBookDisplayName(destination, t)
              })}
            </Alert>
          )}
          {errorMessage && <Alert severity="error">{errorMessage}</Alert>}
          {mergeErrorMessage && (
            <Alert severity={mergeAudienceBlock ? 'info' : 'error'}>
              {mergeErrorMessage}
            </Alert>
          )}
          <DuplicateGroupCard
            group={duplicateGroup}
            isMerged={false}
            isMerging={transferring}
            hideActions
            onMerge={() => {}}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <DuplicateTransferActions
          audienceBlocked={Boolean(mergeAudienceBlock)}
          transferring={transferring}
          withoutMergeLabel={t(
            mergeAudienceBlock === 'audience' ? keys.anyway : keys.withoutMerge
          )}
          onBack={onBack}
          onConfirmWithoutMerge={onConfirmWithoutMerge}
          onConfirmMerge={onConfirmMerge}
        />
      </DialogActions>
    </Dialog>
  )
}
