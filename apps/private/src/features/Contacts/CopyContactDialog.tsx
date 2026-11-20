import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography
} from '@linagora/twake-mui'
import { useI18n } from 'twake-i18n'
import { Contact } from '@common/features/Contacts/contactsTypes'
import { getAddressBookDisplayName } from '@common/features/Contacts/contactsUtils'
import {
  addressBookMenuProps,
  useAddressBookOptions
} from './AddressBookOptions'
import { DuplicateTransferDialog } from './DuplicateTransferDialog'
import { useContactTransfer } from './useContactTransfer'

const TRANSLATION_KEYS = {
  copy: {
    title: 'contacts.copyContact.title',
    error: 'contacts.copyContact.error',
    confirm: 'contacts.copy'
  },
  move: {
    title: 'contacts.moveContact.title',
    error: 'contacts.moveContact.error',
    confirm: 'contacts.moveContact.confirm'
  }
} as const

interface ContactTransferDialogProps {
  contact: Contact
  addressBookId: string
  onClose: () => void
  onSuccess?: (destinationId: string, contactId?: string) => void
  mode?: 'copy' | 'move'
}

export const ContactTransferDialog: React.FC<ContactTransferDialogProps> = ({
  contact,
  addressBookId,
  onClose,
  onSuccess,
  mode = 'copy'
}) => {
  const { t } = useI18n()
  const keys = TRANSLATION_KEYS[mode]
  const {
    books,
    sourceBook,
    destination,
    destinationId,
    setDestinationId,
    transferring,
    error,
    mergeError,
    duplicateGroup,
    canTransfer,
    transfer,
    confirmWithoutMerge,
    confirmMerge,
    backToTransfer
  } = useContactTransfer({ contact, addressBookId, onClose, onSuccess, mode })
  const options = useAddressBookOptions(books)

  if (duplicateGroup && destination) {
    return (
      <DuplicateTransferDialog
        mode={mode}
        destination={destination}
        duplicateGroup={duplicateGroup}
        transferring={transferring}
        errorMessage={error ? t(keys.error) : null}
        mergeError={mergeError}
        onBack={backToTransfer}
        onClose={onClose}
        onConfirmWithoutMerge={() => void confirmWithoutMerge()}
        onConfirmMerge={() => void confirmMerge()}
      />
    )
  }

  return (
    <Dialog
      open
      fullWidth
      maxWidth="sm"
      onClose={transferring ? undefined : onClose}
      aria-labelledby={`${mode}-contact-title`}
      onClick={event => event.stopPropagation()}
    >
      <DialogTitle id={`${mode}-contact-title`}>{t(keys.title)}</DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          <Typography variant="body2" color="text.secondary">
            {t('contacts.transfer.currentlyIn', {
              name: contact.displayName,
              book: getAddressBookDisplayName(sourceBook, t)
            })}
          </Typography>
          {error && <Alert severity="error">{t(keys.error)}</Alert>}
          {books.length === 0 ? (
            <Typography>{t('contacts.copyContact.empty')}</Typography>
          ) : (
            <TextField
              select
              fullWidth
              label={t('contacts.copyContact.destination')}
              value={destinationId}
              disabled={transferring}
              onChange={event => setDestinationId(event.target.value)}
              slotProps={{ select: { MenuProps: addressBookMenuProps } }}
            >
              {options}
            </TextField>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button variant="text" onClick={onClose} disabled={transferring}>
          {t('contacts.form.cancel')}
        </Button>
        <Button
          variant="contained"
          disabled={!canTransfer}
          onClick={() => void transfer()}
        >
          {t(keys.confirm)}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export const CopyContactDialog: React.FC<
  Omit<ContactTransferDialogProps, 'mode'>
> = props => <ContactTransferDialog {...props} mode="copy" />

export const MoveContactDialog: React.FC<
  Omit<ContactTransferDialogProps, 'mode'>
> = props => <ContactTransferDialog {...props} mode="move" />
