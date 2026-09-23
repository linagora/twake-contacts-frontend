import { Button, Snackbar, Alert } from '@linagora/twake-mui'
import { Icon, Upload } from '@linagora/twake-icons'
import { useAppSelector } from '@common/app/hooks'
import {
  importContacts,
  uploadImportFile
} from '@common/features/Contacts/ContactsDao'
import {
  selectBook,
  selectWritableBooks
} from '@common/features/Contacts/contactsSelectors'
import { ErrorSnackbar } from '@common/components/Error/ErrorSnackbar'
import { useRef, useState } from 'react'
import { useI18n } from 'twake-i18n'

interface ImportContactsButtonProps {
  addressBookId?: string
}

export const ImportContactsButton: React.FC<ImportContactsButtonProps> = ({
  addressBookId
}) => {
  const { t } = useI18n()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const userId = useAppSelector(state => state.user.userData.openpaasId)
  const book = useAppSelector(state => selectBook(state, addressBookId))
  const writableBooks = useAppSelector(selectWritableBooks)
  const targetBook = book ?? writableBooks[0]

  if (!targetBook) {
    return null
  }

  const handleImportClick = (): void => {
    fileInputRef.current?.click()
  }

  const handleCloseSuccess = (): void => {
    setUploadSuccess(false)
  }

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ): Promise<void> => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const fileId = await uploadImportFile(file)
      setUploadSuccess(true)
      const target = `/addressbooks/${userId}/${targetBook.id}.json`
      await importContacts(fileId, target)
    } catch (err) {
      setUploadSuccess(false)
      setError(t('error.unknown'))
      console.error('Import failed:', err)
    } finally {
      event.target.value = ''
    }
  }

  return (
    <>
      <Button
        variant="outlined"
        component="label"
        startIcon={<Icon icon={Upload} />}
        onClick={handleImportClick}
      >
        {t('contacts.empty.import')}
        <input
          ref={fileInputRef}
          type="file"
          accept=".vcf"
          hidden
          onChange={e => {
            void handleFileChange(e)
          }}
        />
      </Button>
      <Snackbar
        open={uploadSuccess}
        autoHideDuration={6000}
        onClose={handleCloseSuccess}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="info" onClose={handleCloseSuccess}>
          {t('contacts.empty.uploadSuccess')}
        </Alert>
      </Snackbar>
      <ErrorSnackbar error={error} onClose={() => setError(null)} />
    </>
  )
}
