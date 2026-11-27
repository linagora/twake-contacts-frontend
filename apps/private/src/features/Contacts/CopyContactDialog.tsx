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
import { isSharedAddressBook } from '@common/features/Contacts/addressBookModel'
import { AddressBook, Contact } from '@common/features/Contacts/contactsTypes'
import { getAddressBookDisplayName } from '@common/features/Contacts/contactsUtils'
import { getDuplicateMatchFields } from '@common/features/Contacts/mergeContactsUtils'
import {
  addressBookMenuProps,
  useAddressBookOptions
} from './AddressBookOptions'
import { getSharingStatus } from './AddressBookActions/sharingStatus'
import { DuplicateTransferDialog } from './DuplicateTransferDialog'
import { formatMergeError } from './MergeContacts/formatMergeError'
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

const isBookShared = (book: AddressBook | undefined): boolean =>
  Boolean(
    book &&
    (isSharedAddressBook(book) || getSharingStatus(book)?.kind === 'owned')
  )

const getTransferWarningKey = (
  sourceBook: AddressBook | undefined,
  destinationBook: AddressBook | undefined
):
  | 'contacts.transfer.sharedToSharedWarning'
  | 'contacts.transfer.privateToSharedWarning'
  | undefined => {
  if (!isBookShared(destinationBook)) return undefined
  return isBookShared(sourceBook)
    ? 'contacts.transfer.sharedToSharedWarning'
    : 'contacts.transfer.privateToSharedWarning'
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
  const warningKey = getTransferWarningKey(sourceBook, destination)

  if (duplicateGroup && destination) {
    const matchedFields = getDuplicateMatchFields(
      contact,
      duplicateGroup.entries
        .filter(
          entry =>
            !(
              entry.addressBookId === addressBookId &&
              entry.contact.id === contact.id
            )
        )
        .map(entry => entry.contact)
    )
    return (
      <DuplicateTransferDialog
        mode={mode}
        destination={destination}
        duplicateGroup={duplicateGroup}
        matchedFields={matchedFields}
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

  const mergeErrorMessage = formatMergeError(mergeError, t)
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
          {mergeErrorMessage && (
            <Alert severity="error">{mergeErrorMessage}</Alert>
          )}
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
          {warningKey && destination && (
            <Alert severity="info">
              {t(warningKey, {
                book: getAddressBookDisplayName(destination, t)
              })}
            </Alert>
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
