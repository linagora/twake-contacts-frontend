import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Typography
} from '@linagora/twake-mui'
import { Cross, Icon } from '@linagora/twake-icons'
import { useI18n } from 'twake-i18n'
import {
  AddressBook,
  UserResult
} from '@common/features/Contacts/contactsTypes'
import { UserAutocomplete } from './UserAutocomplete'
import { SubscribableBooksList } from './SubscribableBooksList'
import { usePublicAddressBooks } from './usePublicAddressBooks'
import { ErrorSnackbar } from '@common/components/Error/ErrorSnackbar'

interface Props {
  isSubscribing?: boolean
  error?: string | null
  onClose: () => void
  onConfirm: (user: UserResult, books: AddressBook[]) => void
}

export const SubscribeAddressBookDialog: React.FC<Props> = ({
  isSubscribing,
  error,
  onClose,
  onConfirm
}) => {
  const { t } = useI18n()
  const { user, selectUser, clearUser, books, emptyMessageKey, removeBook } =
    usePublicAddressBooks()
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <Stack direction="row" className="u-flex-items-center">
        <DialogTitle>{t('contacts.addressBook.subscribeTitle')}</DialogTitle>
        <IconButton
          className="u-mr-1"
          aria-label={t('contacts.form.close')}
          onClick={onClose}
        >
          <Icon icon={Cross} />
        </IconButton>
      </Stack>
      <DialogContent>
        <Typography className="u-mb-1">
          {t('contacts.addressBook.userLabel')}
        </Typography>
        <UserAutocomplete onSelect={selectUser} onType={clearUser} />
        {user && (
          <SubscribableBooksList
            user={user}
            books={books}
            emptyMessageKey={emptyMessageKey}
            onRemove={removeBook}
          />
        )}
        {error && <ErrorSnackbar error={error} />}
      </DialogContent>
      <DialogActions>
        <Button variant="text" onClick={onClose}>
          {t('contacts.addressBook.cancel')}
        </Button>
        <Button
          variant="contained"
          disabled={!user || books.length === 0 || isSubscribing}
          onClick={() => user && onConfirm(user, books)}
        >
          {t('contacts.addressBook.subscribe')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
