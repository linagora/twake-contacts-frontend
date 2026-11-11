import { contactPath } from '../contactPath'
import { useAppDispatch, useAppSelector } from '@common/app/hooks'
import { addContactFromSearch } from '@common/features/Contacts/ContactsSlice'
import {
  AddressBook,
  ContactEntry
} from '@common/features/Contacts/contactsTypes'
import { getAddressBookDisplayName } from '@common/features/Contacts/contactsUtils'
import { Alert, Button } from '@linagora/twake-mui'
import { useNavigate } from 'react-router'
import { useI18n } from 'twake-i18n'

interface DuplicateEmailAlertProps {
  duplicates: ContactEntry[]
}

const getBookLabel = (
  book: AddressBook | undefined,
  fallback: string,
  t: (key: string) => string
): string => {
  const name = getAddressBookDisplayName(book, t) || fallback
  return book?.ownerDisplayName ? `${name} (${book.ownerDisplayName})` : name
}

export const DuplicateEmailAlert: React.FC<DuplicateEmailAlertProps> = ({
  duplicates
}) => {
  const { t } = useI18n()
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const [first] = duplicates
  const book = useAppSelector(state =>
    first ? state.contacts.addressBooks[first.addressBookId] : undefined
  )

  if (!first) return null

  const openExisting = (): void => {
    dispatch(addContactFromSearch(first))
    void navigate(contactPath(first.addressBookId, first.contact.id))
  }

  const message =
    duplicates.length === 1
      ? t('contacts.form.duplicateEmail', {
          name: first.contact.displayName,
          book: getBookLabel(book, first.addressBookId, t)
        })
      : t('contacts.form.duplicateEmailMany', {
          smart_count: duplicates.length
        })

  return (
    <Alert
      severity="info"
      action={
        <Button size="small" variant="text" onClick={openExisting}>
          {t('contacts.form.openExisting')}
        </Button>
      }
    >
      {message}
    </Alert>
  )
}
