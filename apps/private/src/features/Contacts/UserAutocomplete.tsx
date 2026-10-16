import { useState } from 'react'
import {
  Autocomplete,
  InputAdornment,
  ListItem,
  Stack,
  TextField
} from '@linagora/twake-mui'
import { Icon, People } from '@linagora/twake-icons'
import { useI18n } from 'twake-i18n'
import { UserResult } from '@common/features/Contacts/contactsTypes'
import { ContactAvatar } from './ContactAvatar'
import { useUserSearch } from './useUserSearch'

export const UserAutocomplete: React.FC<{
  onSelect: (user: UserResult) => void
  onType: () => void
}> = ({ onSelect, onType }) => {
  const { t } = useI18n()
  const [query, setQuery] = useState('')
  const { users, loading } = useUserSearch(query)
  const [open, setOpen] = useState(false)

  return (
    <Autocomplete
      fullWidth
      options={users}
      open={open && query.trim().length > 0}
      onOpen={() => setOpen(true)}
      onClose={() => setOpen(false)}
      loading={loading}
      loadingText={t('contacts.search.loading')}
      openText={t('contacts.form.open')}
      closeText={t('contacts.form.close')}
      value={null}
      inputValue={query}
      onInputChange={(_, value, reason) => {
        if (reason === 'reset') return
        setQuery(value)
        onType()
      }}
      onChange={(_, selected) => {
        if (!selected) return
        onSelect(selected)
        setQuery('')
      }}
      filterOptions={x => x}
      getOptionLabel={option => option.displayName}
      isOptionEqualToValue={(option, v) => option.id === v.id}
      noOptionsText={query.trim() ? t('contacts.addressBook.noUserFound') : ''}
      renderOption={(props, option) => (
        <ListItem {...props} key={option.id}>
          <Stack direction="row" spacing={1}>
            <ContactAvatar size="s" displayName={option.displayName} />
            <span>{option.displayName}</span>
          </Stack>
        </ListItem>
      )}
      renderInput={params => (
        <TextField
          {...params}
          autoFocus
          placeholder={t('contacts.addressBook.userPlaceholder')}
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
