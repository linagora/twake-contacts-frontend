import {
  Grid,
  InputAdornment,
  ListItemText,
  ListSubheader,
  MenuItem,
  ListSubheaderProps,
  TextField
} from '@linagora/twake-mui'
import { Icon, People } from '@linagora/twake-icons'
import { useAppSelector } from '@common/app/hooks'
import { matchesScope } from '@common/features/Contacts/contactsSelectors'
import { AddressBook } from '@common/features/Contacts/contactsTypes'
import {
  getAddressBookDisplayName,
  sortAddressBooks
} from '@common/features/Contacts/contactsUtils'
import { useI18n } from 'twake-i18n'
import { FormRow } from '../FormRow'

interface AddressBookFieldProps {
  addressBooks: AddressBook[]
  value: string
  disabled?: boolean
  onChange: (value: string) => void
}

// Select clones every child as an option: restore the caption semantics
// once its props are applied so the group label is not announced as a choice
const GroupCaption: React.FC<ListSubheaderProps> = ({
  role: _role,
  'aria-selected': _ariaSelected,
  ...props
}) => <ListSubheader {...props} role="presentation" />

export const AddressBookField: React.FC<AddressBookFieldProps> = ({
  addressBooks,
  value,
  disabled = false,
  onChange
}) => {
  const { t } = useI18n()
  const openpaasId = useAppSelector(state => state.user.userData.openpaasId)
  // same grouping as the sidebar: own books, then the books shared with the
  // user; the domain book is never listed
  const sortedBooks = sortAddressBooks(addressBooks, t)
  const ownBooks = sortedBooks.filter(book =>
    matchesScope(book, 'onlyMine', openpaasId)
  )
  const sharedBooks = sortedBooks.filter(book =>
    matchesScope(book, 'shared', openpaasId)
  )

  const renderOption = (book: AddressBook): React.ReactNode => (
    <MenuItem key={book.id} value={book.id}>
      <ListItemText
        primary={getAddressBookDisplayName(book, t)}
        secondary={book.ownerDisplayName}
      />
    </MenuItem>
  )

  return (
    <FormRow>
      <Grid size={8}>
        <TextField
          select
          fullWidth
          variant="outlined"
          disabled={disabled}
          value={value}
          onChange={e => onChange(e.target.value)}
          slotProps={{
            select: { 'aria-label': t('contacts.form.addressBook') },
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <Icon icon={People} />
                </InputAdornment>
              )
            }
          }}
        >
          {ownBooks.map(renderOption)}
          {sharedBooks.length > 0 && (
            <GroupCaption>{t('contacts.shared')}</GroupCaption>
          )}
          {sharedBooks.map(renderOption)}
        </TextField>
      </Grid>
    </FormRow>
  )
}
