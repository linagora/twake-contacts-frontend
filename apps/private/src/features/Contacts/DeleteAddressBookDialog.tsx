import { AddressBook } from '@common/features/Contacts/contactsTypes'
import { getAddressBookDisplayName } from '@common/features/Contacts/contactsUtils'
import {
  Button,
  Dialog,
  DialogActions,
  DialogCloseButton,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Stack
} from '@linagora/twake-mui'
import { useI18n } from 'twake-i18n'
import { AddressBookPaper } from './AddressBookPaper'

interface DeleteAddressBookDialogProps {
  book: AddressBook
  onClose: () => void
  onConfirm: () => void
}

export const DeleteAddressBookDialog: React.FC<
  DeleteAddressBookDialogProps
> = ({ book, onClose, onConfirm }) => {
  const { t } = useI18n()
  const isCopy = Boolean(book.ownerId)

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle className="dialogTitleWithClose">
        {t(
          isCopy
            ? 'contacts.addressBook.removeTitle'
            : 'contacts.addressBook.deleteTitle'
        )}
      </DialogTitle>
      <DialogCloseButton onClick={onClose} />
      <DialogContent>
        <Stack spacing={2}>
          <DialogContentText>
            {t(
              isCopy
                ? 'contacts.addressBook.removeDescription'
                : 'contacts.addressBook.deleteDescription',
              { name: getAddressBookDisplayName(book, t) }
            )}
          </DialogContentText>
          <AddressBookPaper book={book} ownerName={book.ownerDisplayName} />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button variant="outlined" onClick={onClose}>
          {t('contacts.form.cancel')}
        </Button>
        <Button variant="contained" onClick={onConfirm}>
          {t(
            isCopy
              ? 'contacts.addressBook.removeConfirm'
              : 'contacts.addressBook.deleteConfirm'
          )}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
