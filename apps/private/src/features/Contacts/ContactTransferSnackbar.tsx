import { contactPath } from './contactPath'
import { Cross, Icon } from '@linagora/twake-icons'
import { Alert, Button, IconButton, Snackbar } from '@linagora/twake-mui'
import { useNavigate } from 'react-router'
import { useI18n } from 'twake-i18n'
import { useAppDispatch, useAppSelector } from '@common/app/hooks'
import { clearTransferSuccess } from '@common/features/Contacts/ContactsSlice'
import { getAddressBookDisplayName } from '@common/features/Contacts/contactsUtils'

export const ContactTransferSnackbar: React.FC = () => {
  const { t } = useI18n()
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const success = useAppSelector(state => state.contacts.transferSuccess)
  const destination = useAppSelector(state =>
    success ? state.contacts.addressBooks[success.destinationId] : undefined
  )
  const handleClose = (): void => {
    dispatch(clearTransferSuccess())
  }

  if (!success) return null

  const handleOpen = (): void => {
    handleClose()
    void navigate(contactPath(success.destinationId, success.contactId))
  }

  return (
    <Snackbar
      key={success.requestId}
      open
      autoHideDuration={6000}
      onClose={(_event, reason) => {
        if (reason !== 'clickaway') handleClose()
      }}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
    >
      <Alert
        variant="filled"
        severity="success"
        action={
          <>
            <Button color="inherit" size="small" onClick={handleOpen}>
              {t('contacts.transfer.open')}
            </Button>
            <IconButton
              color="inherit"
              size="small"
              aria-label={t('contacts.form.close')}
              onClick={handleClose}
            >
              <Icon icon={Cross} />
            </IconButton>
          </>
        }
      >
        {t(
          success.operation === 'copy'
            ? 'contacts.copyContact.success'
            : 'contacts.moveContact.success',
          {
            name: success.contactName,
            book: getAddressBookDisplayName(destination, t)
          }
        )}
      </Alert>
    </Snackbar>
  )
}
