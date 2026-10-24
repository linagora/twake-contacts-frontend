import { Dispatch, SetStateAction, useState } from 'react'
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
import { useAppDispatch, useAppSelector } from '@common/app/hooks'
import {
  copyContact,
  moveContact
} from '@common/features/Contacts/ContactsSlice'
import {
  AddressBookWithContacts,
  Contact
} from '@common/features/Contacts/contactsTypes'
import { isContactTransferDestination } from '@common/features/Contacts/contactsUtils'
import { useAddressBookOptions } from './AddressBookOptions'

interface ContactTransferDialogProps {
  contact: Contact
  addressBookId: string
  onClose: () => void
  onSuccess?: (destinationId: string) => void
  mode?: 'copy' | 'move'
}

const useContactTransfer = ({
  contact,
  addressBookId,
  onClose,
  onSuccess,
  mode
}: ContactTransferDialogProps): {
  books: AddressBookWithContacts[]
  destinationId: string
  setDestinationId: Dispatch<SetStateAction<string>>
  transferring: boolean
  error: boolean
  canTransfer: boolean
  transfer: () => Promise<void>
} => {
  const dispatch = useAppDispatch()
  const addressBooks = useAppSelector(state => state.contacts.addressBooks)
  const books = Object.values(addressBooks).filter(
    (book): book is AddressBookWithContacts =>
      isContactTransferDestination(book, addressBookId)
  )
  const [destinationId, setDestinationId] = useState('')
  const [transferring, setTransferring] = useState(false)
  const [error, setError] = useState(false)
  const destination = books.find(book => book.id === destinationId)
  const source = addressBooks[addressBookId]
  const canTransfer = !!source?.canWrite && !!destination && !transferring
  const handleTransfer = async (): Promise<void> => {
    if (!canTransfer) return
    setTransferring(true)
    setError(false)
    try {
      const args = {
        fromAddressBookId: addressBookId,
        toAddressBookId: destinationId,
        contact
      }
      if (mode === 'move') {
        await dispatch(moveContact({ ...args, userId: source.userId })).unwrap()
      } else {
        await dispatch(copyContact(args)).unwrap()
      }
      onClose()
      onSuccess?.(destinationId)
    } catch {
      setError(true)
    } finally {
      setTransferring(false)
    }
  }

  return {
    books,
    destinationId,
    setDestinationId,
    transferring,
    error,
    canTransfer,
    transfer: handleTransfer
  }
}

export const ContactTransferDialog: React.FC<ContactTransferDialogProps> = ({
  contact,
  addressBookId,
  onClose,
  onSuccess,
  mode = 'copy'
}) => {
  const { t } = useI18n()
  const translationKey =
    mode === 'move' ? 'contacts.moveContact' : 'contacts.copyContact'
  const {
    books,
    destinationId,
    setDestinationId,
    transferring,
    error,
    canTransfer,
    transfer
  } = useContactTransfer({ contact, addressBookId, onClose, onSuccess, mode })
  const options = useAddressBookOptions(books)

  return (
    <Dialog
      open
      fullWidth
      maxWidth="sm"
      onClose={transferring ? undefined : onClose}
      aria-labelledby={`${mode}-contact-title`}
      onClick={event => event.stopPropagation()}
    >
      <DialogTitle id={`${mode}-contact-title`}>
        {t(`${translationKey}.title`)}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          {error && (
            <Alert severity="error">{t(`${translationKey}.error`)}</Alert>
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
            >
              {options}
            </TextField>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={transferring}>
          {t('contacts.form.cancel')}
        </Button>
        <Button
          variant="contained"
          disabled={!canTransfer}
          onClick={() => void transfer()}
        >
          {mode === 'move'
            ? t('contacts.moveContact.confirm')
            : t('contacts.copy')}
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
