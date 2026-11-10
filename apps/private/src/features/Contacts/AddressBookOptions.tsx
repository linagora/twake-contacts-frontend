import {
  ListItemText,
  ListSubheader,
  ListSubheaderProps,
  MenuItem
} from '@linagora/twake-mui'
import { useI18n } from 'twake-i18n'
import {
  isOwnAddressBook,
  isSharedAddressBook
} from '@common/features/Contacts/addressBookModel'
import { AddressBook } from '@common/features/Contacts/contactsTypes'
import {
  getAddressBookDisplayName,
  sortAddressBooks
} from '@common/features/Contacts/contactsUtils'

// Select clones every child as an option: restore the caption semantics
// once its props are applied so the group label is not announced as a choice
const GroupCaption: React.FC<ListSubheaderProps> = ({
  role: _role,
  'aria-selected': _ariaSelected,
  ...props
}) => <ListSubheader {...props} role="presentation" />

// Options of an address book select, with the same grouping as the sidebar:
// own books, then the books shared with the user; the domain book is never
// listed. Returned as a flat array since Select only reads its direct children
export const useAddressBookOptions = (
  addressBooks: AddressBook[]
): React.ReactNode[] => {
  const { t } = useI18n()
  const sortedBooks = sortAddressBooks(addressBooks, t)
  const ownBooks = sortedBooks.filter(isOwnAddressBook)
  const sharedBooks = sortedBooks.filter(isSharedAddressBook)

  const renderOption = (book: AddressBook): React.ReactNode => (
    <MenuItem key={book.id} value={book.id}>
      <ListItemText
        primary={getAddressBookDisplayName(book, t)}
        secondary={book.ownerDisplayName}
      />
    </MenuItem>
  )

  return [
    ...ownBooks.map(renderOption),
    ...(sharedBooks.length > 0
      ? [
          <GroupCaption key="shared-caption">
            {t('contacts.shared')}
          </GroupCaption>
        ]
      : []),
    ...sharedBooks.map(renderOption)
  ]
}
