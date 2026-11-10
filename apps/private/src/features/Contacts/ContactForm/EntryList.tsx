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
import { useEffect, useRef } from 'react'
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
  const { isMobile } = useBreakpoints()
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])
  const removedIndex = useRef<number | null>(null)

  // Once a row is removed, the focus goes to the value of the row taking its
  // place, or of the row before it when the last one was removed: the X it
  // was on is gone, and the focus would otherwise fall to the page body.
  useEffect(() => {
    if (removedIndex.current === null) return
    const nextIndex = Math.min(removedIndex.current, entries.length - 1)
    removedIndex.current = null
    inputRefs.current[nextIndex]?.focus()
  }, [entries.length])

  const handleRemove = (index: number): void => {
    removedIndex.current = index
    onRemove(index)
  }

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
              inputRef={(element: HTMLInputElement | null) => {
                inputRefs.current[index] = element
              }}
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
          {shouldRenderRemoveGrid && (
            <Grid size={isMobile ? 2 : 1}>
              {index > 0 && (
                <Tooltip disableInteractive title={t('contacts.form.remove')}>
                  <IconButton
                    onClick={() => handleRemove(index)}
                    aria-label={t('contacts.form.remove')}
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
