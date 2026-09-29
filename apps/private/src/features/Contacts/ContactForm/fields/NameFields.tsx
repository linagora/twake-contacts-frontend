import { Grid, TextField } from '@linagora/twake-mui'
import { useI18n } from 'twake-i18n'
import { FormRow } from '../FormRow'

interface NameFieldsProps {
  givenName: string
  familyName: string
  onChange: (field: 'givenName' | 'familyName', value: string) => void
}

export const NameFields: React.FC<NameFieldsProps> = ({
  givenName,
  familyName,
  onChange
}) => {
  const { t } = useI18n()
  return (
    <FormRow>
      <Grid size={4}>
        <TextField
          fullWidth
          autoFocus
          variant="outlined"
          label={t('contacts.form.firstName')}
          value={givenName}
          onChange={e => onChange('givenName', e.target.value)}
          slotProps={{
            htmlInput: { 'aria-label': t('contacts.form.firstName') }
          }}
        />
      </Grid>
      <Grid size={4}>
        <TextField
          fullWidth
          variant="outlined"
          label={t('contacts.form.lastName')}
          value={familyName}
          onChange={e => onChange('familyName', e.target.value)}
          slotProps={{
            htmlInput: { 'aria-label': t('contacts.form.lastName') }
          }}
        />
      </Grid>
    </FormRow>
  )
}
