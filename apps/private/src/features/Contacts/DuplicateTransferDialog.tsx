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
import { DuplicateGroupCard } from './MergeContacts/DuplicateGroupCard'
import { formatMergeError } from './MergeContacts/formatMergeError'

interface DuplicateTransferDialogProps {
  mode: 'copy' | 'move'
  destination: AddressBookWithContacts
  duplicateGroup: DuplicateContactGroup
  transferring: boolean
  errorMessage: string | null
  mergeError: MergeGroupError | null
  onBack: () => void
  onClose: () => void
  onConfirmWithoutMerge: () => void
  onConfirmMerge: () => void
}

const MODE_KEYS = {
  copy: {
    alert: 'contacts.transfer.duplicateCopyAlert',
    withoutMerge: 'contacts.transfer.copyWithoutMerge'
  },
  move: {
    alert: 'contacts.transfer.duplicateMoveAlert',
    withoutMerge: 'contacts.transfer.moveWithoutMerge'
  }
} as const

export const DuplicateTransferDialog: React.FC<
  DuplicateTransferDialogProps
> = ({
  mode,
  destination,
  duplicateGroup,
  transferring,
  errorMessage,
  mergeError,
  onBack,
  onClose,
  onConfirmWithoutMerge,
  onConfirmMerge
}) => {
  const { t } = useI18n()
  const keys = MODE_KEYS[mode]
  const mergeErrorMessage = formatMergeError(mergeError, t)

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
          <Alert severity="info">
            {t(keys.alert, {
              book: getAddressBookDisplayName(destination, t)
            })}
          </Alert>
          {errorMessage && <Alert severity="error">{errorMessage}</Alert>}
          {mergeErrorMessage && (
            <Alert severity="error">{mergeErrorMessage}</Alert>
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
              {t(keys.withoutMerge)}
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
      </DialogActions>
    </Dialog>
  )
}
