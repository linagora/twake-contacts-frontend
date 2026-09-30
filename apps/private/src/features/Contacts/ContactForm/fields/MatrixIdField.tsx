import { Grid, InputAdornment, TextField } from '@linagora/twake-mui'
import { Icon, Matrix } from '@linagora/twake-icons'
import { useI18n } from 'twake-i18n'
import { FormRow } from '../FormRow'

interface MatrixIdFieldProps {
  value: string
  onChange: (value: string) => void
}

export const MatrixIdField: React.FC<MatrixIdFieldProps> = ({
  value,
  onChange
}) => {
  const { t } = useI18n()
  return (
    <FormRow>
      <Grid size={8}>
        <TextField
          fullWidth
          variant="outlined"
          label={t('contacts.form.matrixId')}
          value={value}
          onChange={e => onChange(e.target.value)}
          slotProps={{
            htmlInput: { 'aria-label': t('contacts.form.matrixId') },
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <Icon icon={Matrix} />
                </InputAdornment>
              )
            }
          }}
        />
      </Grid>
    </FormRow>
  )
}
