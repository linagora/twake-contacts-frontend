import { useAppDispatch } from '@common/app/hooks'
import { clearError as userClearError } from '@common/features/User/UserSlice'
import { Alert, Button, Snackbar } from '@linagora/twake-mui'
import { useI18n } from 'twake-i18n'

export function ErrorSnackbar({
  error,
  onClose
}: {
  error: string | null
  onClose?: () => void
}): React.ReactElement | null {
  const { t } = useI18n()
  const dispatch = useAppDispatch()

  const handleCloseSnackbar = (): void => {
    if (onClose) {
      onClose()
    } else {
      dispatch(userClearError())
    }
  }

  const getErrorMessage = (): string => {
    if (!error) return t('error.unknown')

    // Check if error message is a translation key with params
    // Format: TRANSLATION:key|param1=value1|param2=value2
    if (error.startsWith('TRANSLATION:')) {
      const parts = error.substring(12).split('|')
      const translationKey = parts[0]
      const params: Record<string, string> = {}

      for (let i = 1; i < parts.length; i++) {
        const equalIndex = parts[i].indexOf('=')
        if (equalIndex === -1) continue
        const key = parts[i].substring(0, equalIndex)
        const value = parts[i].substring(equalIndex + 1)
        if (key && value) {
          try {
            params[key] = decodeURIComponent(value)
          } catch {
            params[key] = value
          }
        }
      }

      return t(translationKey, params)
    }

    return error
  }

  return (
    <Snackbar
      open={!!error}
      onClose={handleCloseSnackbar}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
    >
      <Alert
        severity="error"
        onClose={handleCloseSnackbar}
        sx={{ width: '100%' }}
        action={
          <Button color="inherit" size="small" onClick={handleCloseSnackbar}>
            {t('common.ok')}
          </Button>
        }
      >
        {getErrorMessage()}
      </Alert>
    </Snackbar>
  )
}
