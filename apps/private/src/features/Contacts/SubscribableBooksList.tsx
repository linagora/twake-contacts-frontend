import { Stack, Typography } from '@linagora/twake-mui'
import { useI18n } from 'twake-i18n'
import {
  RawAddressBook,
  UserResult
} from '@common/features/Contacts/contactsTypes'
import { AddressBookPaper } from './AddressBookPaper'

interface Props {
  user: UserResult
  books: RawAddressBook[]
  emptyMessageKey: string | null
  onRemove: (book: RawAddressBook) => void
}

export const SubscribableBooksList: React.FC<Props> = ({
  user,
  books,
  emptyMessageKey,
  onRemove
}) => {
  const { t } = useI18n()

  return (
    <>
      <Stack className="u-mt-1" spacing={1}>
        {books.map(book => (
          <AddressBookPaper
            key={book.id}
            ownerName={user.displayName}
            book={book}
            onRemove={() => onRemove(book)}
          />
        ))}
      </Stack>
      {emptyMessageKey && (
        <Typography color="text.secondary" className="u-mt-1">
          {t(emptyMessageKey)}
        </Typography>
      )}
    </>
  )
}
