import { AddressBook } from '@common/features/Contacts/contactsTypes'
import { getAddressBookDisplayName } from '@common/features/Contacts/contactsUtils'
import { Cross, Icon } from '@linagora/twake-icons'
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  ListItem,
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
  // a book shared with the user is not offered by the search of the owner's
  // public books, only its owner can share it again
  const isDelegated = isCopy && book.subscriptionType === 'delegation'

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>
        <ListItem
          disableGutters
          disablePadding
          secondaryAction={
            <IconButton
              edge="end"
              aria-label={t('contacts.form.close')}
              onClick={onClose}
            >
              <Icon icon={Cross} />
            </IconButton>
          }
        >
          {t(
            isCopy
              ? 'contacts.addressBook.removeTitle'
              : 'contacts.addressBook.deleteTitle'
          )}
        </ListItem>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          <DialogContentText>
            <DialogContentText>
              {t(
                isDelegated
                  ? 'contacts.addressBook.removeDelegatedDescription'
                  : isCopy
                    ? 'contacts.addressBook.removeDescription'
                    : 'contacts.addressBook.deleteDescription',
                { name: getAddressBookDisplayName(book, t) }
              )}
            </DialogContentText>
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
