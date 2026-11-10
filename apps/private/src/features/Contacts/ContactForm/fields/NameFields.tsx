import { Grid, TextField, useBreakpoints } from '@linagora/twake-mui'
import { useId } from 'react'
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
  const { isMobile } = useBreakpoints()
  const givenNameId = useId()
  const helperTextId = `${givenNameId}-helper-text`
  const isNameMissing = !givenName.trim() && !familyName.trim()
  const requirementProps = {
    'aria-describedby': helperTextId,
    'aria-required': isNameMissing || undefined
  }
  return (
    <FormRow>
      <Grid size={isMobile ? 12 : 4}>
        <TextField
          id={givenNameId}
          fullWidth
          autoFocus
          size="small"
          variant="outlined"
          label={t('contacts.form.firstName')}
          value={givenName}
          onChange={e => onChange('givenName', e.target.value)}
          helperText={t('contacts.form.nameRequired')}
          slotProps={{
            htmlInput: {
              'aria-label': t('contacts.form.firstName'),
              ...requirementProps
            },
            formHelperText: { id: helperTextId }
          }}
        />
      </Grid>
      <Grid size={isMobile ? 12 : 4}>
        <TextField
          fullWidth
          size="small"
          variant="outlined"
          label={t('contacts.form.lastName')}
          value={familyName}
          onChange={e => onChange('familyName', e.target.value)}
          slotProps={{
            htmlInput: {
              'aria-label': t('contacts.form.lastName'),
              ...requirementProps
            }
          }}
        />
      </Grid>
    </FormRow>
  )
}
