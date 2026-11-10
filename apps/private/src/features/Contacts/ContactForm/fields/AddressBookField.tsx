import {
  Grid,
  InputAdornment,
  TextField,
  useBreakpoints
} from '@linagora/twake-mui'
import { Icon, People } from '@linagora/twake-icons'
import { AddressBook } from '@common/features/Contacts/contactsTypes'
import { useI18n } from 'twake-i18n'
import {
  addressBookMenuProps,
  useAddressBookOptions
} from '../../AddressBookOptions'
import { FormRow } from '../FormRow'

interface AddressBookFieldProps {
  addressBooks: AddressBook[]
  value: string
  disabled?: boolean
  helperText?: string
  onChange: (value: string) => void
}

export const AddressBookField: React.FC<AddressBookFieldProps> = ({
  addressBooks,
  value,
  disabled = false,
  helperText,
  onChange
}) => {
  const { t } = useI18n()
  const { isMobile } = useBreakpoints()
  const options = useAddressBookOptions(addressBooks)

  return (
    <FormRow>
      <Grid size={isMobile ? 12 : 8}>
        <TextField
          select
          fullWidth
          size="small"
          variant="outlined"
          label={t('contacts.form.addressBook')}
          helperText={helperText}
          disabled={disabled}
          value={value}
          onChange={e => onChange(e.target.value)}
          slotProps={{
            select: { MenuProps: addressBookMenuProps },
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <Icon icon={People} />
                </InputAdornment>
              )
            }
          }}
        >
          {options}
        </TextField>
      </Grid>
    </FormRow>
  )
}
