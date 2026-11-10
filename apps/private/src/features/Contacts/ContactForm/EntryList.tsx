import { Cross, Icon } from '@linagora/twake-icons'
import {
  Grid,
  IconButton,
  InputAdornment,
  MenuItem,
  Select,
  Stack,
  TextField,
  Tooltip,
  useBreakpoints
} from '@linagora/twake-mui'
import { useI18n } from 'twake-i18n'
import { FormRow } from './FormRow'
import { ContactFormEntry } from './types'

export interface EntryListProps {
  icon: React.ComponentType
  entries: ContactFormEntry[]
  types: string[]
  label: string
  typeLabel?: string
  removeLabel: string
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
  typeLabel,
  removeLabel,
  onChange,
  onRemove,
  onBlur,
  showTypeSelector = true,
  validate,
  validationMessage,
  touched = []
}) => {
  const { t } = useI18n()
  const { isMobile } = useBreakpoints()

  if (entries.length === 0) return null

  const getError = (value: string, index: number): boolean => {
    if (!validate || !value || !touched[index]) return false
    return !validate(value)
  }

  const hasMultiple = entries.length > 1
  const textFieldSize = isMobile
    ? showTypeSelector
      ? hasMultiple
        ? 6
        : 8
      : hasMultiple
        ? 10
        : 12
    : showTypeSelector
      ? 5
      : 8
  const shouldRenderRemoveGrid = !isMobile || hasMultiple

  return (
    <Stack spacing={3}>
      {entries.map((entry, index) => (
        <FormRow key={index}>
          <Grid size={textFieldSize}>
            <TextField
              fullWidth
              size="small"
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
            <Grid size={isMobile ? 4 : 3}>
              <Select
                fullWidth
                size="small"
                variant="outlined"
                value={entry.type || ''}
                onChange={e => onChange(index, { type: e.target.value })}
                aria-label={typeLabel ?? t('contacts.form.type')}
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
          {shouldRenderRemoveGrid && (
            <Grid size={isMobile ? 2 : 1}>
              {index > 0 && (
                <Tooltip disableInteractive title={removeLabel}>
                  <IconButton
                    onClick={() => onRemove(index)}
                    aria-label={removeLabel}
                  >
                    <Icon icon={Cross} />
                  </IconButton>
                </Tooltip>
              )}
            </Grid>
          )}
        </FormRow>
      ))}
    </Stack>
  )
}
