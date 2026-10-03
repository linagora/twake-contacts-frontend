import { Grid, InputAdornment, MenuItem, TextField } from '@linagora/twake-mui'
import { Icon, People } from '@linagora/twake-icons'
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

export const AddressBookField: React.FC<AddressBookFieldProps> = ({
  addressBooks,
  value,
  disabled = false,
  onChange
}) => {
  const { t } = useI18n()
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
          {sortAddressBooks(addressBooks, t).map(book => (
            <MenuItem key={book.id} value={book.id}>
              {getAddressBookDisplayName(book, t) || t('contacts.myContacts')}
            </MenuItem>
          ))}
        </TextField>
      </Grid>
    </FormRow>
  )
}
