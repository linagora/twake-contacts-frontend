import { useState } from 'react'
import {
  Button,
  Dialog,
  DialogActions,
  DialogCloseButton,
  DialogContent,
  DialogTitle,
  InputAdornment,
  TextField,
  Typography
} from '@linagora/twake-mui'
import { Icon, Peoples } from '@linagora/twake-icons'
import { useI18n } from 'twake-i18n'

const NAME_LABEL_ID = 'create-address-book-name-label'
const NAME_FIELD_ID = 'create-address-book-name'

interface CreateAddressBookDialogProps {
  isCreating?: boolean
  onClose: () => void
  onConfirm: (name: string) => void
}

export const CreateAddressBookDialog: React.FC<
  CreateAddressBookDialogProps
> = ({ isCreating, onClose, onConfirm }) => {
  const { t } = useI18n()
  const [name, setName] = useState('')
  const canSubmit = !!name.trim() && !isCreating

  const handleSubmit = (e: React.SubmitEvent): void => {
    e.preventDefault()
    if (canSubmit) onConfirm(name.trim())
  }

  return (
    <Dialog
      open
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      slotProps={{ paper: { component: 'form', onSubmit: handleSubmit } }}
    >
      <DialogTitle className="dialogTitleWithClose">
        {t('contacts.addressBook.createTitle')}
      </DialogTitle>
      <DialogCloseButton onClick={onClose} />
      <DialogContent>
        <Typography
          className="u-mb-1 u-db"
          component="label"
          id={NAME_LABEL_ID}
          htmlFor={NAME_FIELD_ID}
        >
          {t('contacts.addressBook.nameLabel')}
        </Typography>
        <TextField
          id={NAME_FIELD_ID}
          fullWidth
          placeholder={t('contacts.addressBook.namePlaceholder')}
          value={name}
          onChange={e => setName(e.target.value)}
          autoFocus
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <Icon icon={Peoples} />
                </InputAdornment>
              )
            }
          }}
        />
      </DialogContent>
      <DialogActions>
        <Button variant="text" onClick={onClose}>
          {t('contacts.addressBook.cancel')}
        </Button>
        <Button variant="contained" type="submit" disabled={!canSubmit}>
          {t('contacts.addressBook.save')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
