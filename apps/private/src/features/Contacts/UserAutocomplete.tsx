import { useState } from 'react'
import {
  Autocomplete,
  InputAdornment,
  ListItem,
  ListItemAvatar,
  ListItemText,
  TextField
} from '@linagora/twake-mui'
import { Icon, People } from '@linagora/twake-icons'
import { useI18n } from 'twake-i18n'
import { UserResult } from '@common/features/Contacts/contactsTypes'
import { ContactAvatar } from './ContactAvatar'
import { useUserSearch } from './useUserSearch'

const primaryEmail = (user: UserResult): string => user.emails[0]?.value ?? ''

const userLabel = (user: UserResult): string =>
  user.displayName || primaryEmail(user)

export const UserAutocomplete: React.FC<{
  onSelect: (user: UserResult) => void
  onType: () => void
}> = ({ onSelect, onType }) => {
  const { t } = useI18n()
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<UserResult | null>(null)
  // the picked user stays in the field: no need to search for its label
  const { users, loading } = useUserSearch(selected ? '' : query)
  const [open, setOpen] = useState(false)

  return (
    <Autocomplete
      fullWidth
      options={selected ? [selected] : users}
      open={open && !selected && query.trim().length > 0}
      onOpen={() => setOpen(true)}
      onClose={() => setOpen(false)}
      loading={loading}
      loadingText={t('contacts.search.loading')}
      value={selected}
      inputValue={query}
      onInputChange={(_, value, reason) => {
        if (reason === 'reset') return
        setQuery(value)
        setSelected(null)
        onType()
      }}
      onChange={(_, user) => {
        if (!user) return
        setSelected(user)
        setQuery(userLabel(user))
        onSelect(user)
      }}
      filterOptions={x => x}
      getOptionLabel={userLabel}
      isOptionEqualToValue={(option, v) => option.id === v.id}
      noOptionsText={query.trim() ? t('contacts.addressBook.noUserFound') : ''}
      renderOption={(props, option) => (
        <ListItem {...props} key={option.id}>
          <ListItemAvatar>
            <ContactAvatar size="s" displayName={option.displayName} />
          </ListItemAvatar>
          <ListItemText
            primary={option.displayName}
            secondary={primaryEmail(option)}
          />
        </ListItem>
      )}
      renderInput={params => (
        <TextField
          {...params}
          autoFocus
          placeholder={t('contacts.addressBook.userPlaceholder')}
          helperText={selected ? primaryEmail(selected) : undefined}
          slotProps={{
            ...params.slotProps,
            input: {
              ...params.slotProps?.input,
              startAdornment: (
                <InputAdornment position="start">
                  <Icon icon={People} />
                </InputAdornment>
              )
            }
          }}
        />
      )}
    />
  )
}
