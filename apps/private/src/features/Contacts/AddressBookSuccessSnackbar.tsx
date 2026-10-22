import { Alert, Snackbar } from '@linagora/twake-mui'
import { useI18n } from 'twake-i18n'
import { useAppDispatch, useAppSelector } from '@common/app/hooks'
import { clearAddressBookSuccess } from '@common/features/Contacts/ContactsSlice'

const MESSAGE_KEYS = {
  update: 'contacts.addressBook.updateSuccess',
  delete: 'contacts.addressBook.deleteSuccess',
  remove: 'contacts.addressBook.removeSuccess'
} as const

export const AddressBookSuccessSnackbar: React.FC = () => {
  const { t } = useI18n()
  const dispatch = useAppDispatch()
  const success = useAppSelector(state => state.contacts.addressBookSuccess)
  const handleClose = (): void => {
    dispatch(clearAddressBookSuccess())
  }

  if (!success) return null

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
        closeText={t('contacts.form.close')}
        onClose={handleClose}
      >
        {t(MESSAGE_KEYS[success.operation])}
      </Alert>
    </Snackbar>
  )
}
