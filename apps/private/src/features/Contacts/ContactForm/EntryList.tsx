import {
  Button,
  Grid,
  InputAdornment,
  MenuItem,
  Select,
  Stack,
  TextField,
  Tooltip
} from '@linagora/twake-mui'
import { Cross, Icon } from '@linagora/twake-icons'
import { useI18n } from 'twake-i18n'
import { FormRow } from './FormRow'
import { ContactFormEntry } from './types'

export interface EntryListProps {
  icon: React.ComponentType
  entries: ContactFormEntry[]
  types: string[]
  label: string
  onChange: (index: number, patch: Partial<ContactFormEntry>) => void
  onRemove: (index: number) => void
  onBlur?: (index: number) => void
  showTypeSelector?: boolean
  validate?: (value: string) => boolean
  validationMessage?: string
  touched?: boolean[]
}

export const EntryList: React.FC<EntryListProps> = ({
  icon,
  entries,
  types,
  label,
  onChange,
  onRemove,
  onBlur,
  showTypeSelector = true,
  validate,
  validationMessage,
  touched = []
}) => {
  const { t } = useI18n()
  if (entries.length === 0) return null

  const getError = (value: string, index: number): boolean => {
    if (!validate || !value || !touched[index]) return false
    return !validate(value)
  }

  return (
    <Stack spacing={3}>
      {entries.map((entry, index) => (
        <FormRow key={index}>
          <Grid size={showTypeSelector ? 6 : 8}>
            <TextField
              fullWidth
              variant="outlined"
              label={label}
              value={entry.value}
              onChange={e => onChange(index, { value: e.target.value })}
              onBlur={() => onBlur?.(index)}
              error={getError(entry.value, index)}
              helperText={getError(entry.value, index) ? validationMessage : ''}
              slotProps={{
                htmlInput: { 'aria-label': label },
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <Icon icon={icon} />
                    </InputAdornment>
                  )
                }
              }}
            />
          </Grid>
          {showTypeSelector && (
            <Grid size={2}>
              <Select
                fullWidth
                variant="outlined"
                value={entry.type || ''}
                onChange={e => onChange(index, { type: e.target.value })}
                aria-label={t('contacts.form.type')}
                displayEmpty
              >
                <MenuItem value="">{t('contacts.form.typeLabel')}</MenuItem>
                {types.map(type => (
                  <MenuItem key={type} value={type}>
                    {t(`contacts.types.${type}`)}
                  </MenuItem>
                ))}
              </Select>
            </Grid>
          )}
          <Grid size={1}>
            {index > 0 && (
              <Tooltip title={t('contacts.form.remove')}>
                <Button
                  variant="text"
                  onClick={() => onRemove(index)}
                  aria-label={t('contacts.form.remove')}
                >
                  <Icon icon={Cross} />
                </Button>
              </Tooltip>
            )}
          </Grid>
        </FormRow>
      ))}
    </Stack>
  )
}
