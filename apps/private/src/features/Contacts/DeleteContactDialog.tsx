import { Contact } from '@common/features/Contacts/contactsTypes'
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
import { ContactPaper } from './ContactPaper'

interface DeleteContactDialogProps {
  contact: Contact
  onClose: () => void
  onConfirm: () => void
}

export const DeleteContactDialog: React.FC<DeleteContactDialogProps> = ({
  contact,
  onClose,
  onConfirm
}) => {
  const { t } = useI18n()
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle className="dialogTitleWithClose">
        {t('contacts.delete.title')}
      </DialogTitle>
      <DialogCloseButton onClick={onClose} />
      <DialogContent>
        <Stack spacing={2}>
          <DialogContentText>
            {t('contacts.delete.description')}
          </DialogContentText>
          <ContactPaper contact={contact} />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button variant="outlined" onClick={onClose}>
          {t('contacts.form.cancel')}
        </Button>
        <Button variant="contained" onClick={onConfirm}>
          {t('contacts.delete.confirm')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
