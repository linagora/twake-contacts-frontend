import {
  Grid,
  InputAdornment,
  TextField,
  useBreakpoints
} from '@linagora/twake-mui'
import { Icon, People } from '@linagora/twake-icons'
import { AddressBook } from '@common/features/Contacts/contactsTypes'
import { useI18n } from 'twake-i18n'
import { useAddressBookOptions } from '../../AddressBookOptions'
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
          {options}
        </TextField>
      </Grid>
    </FormRow>
  )
}
