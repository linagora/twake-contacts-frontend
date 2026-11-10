import { useAppDispatch } from '@common/app/hooks'
import { addContactFromSearch } from '@common/features/Contacts/ContactsSlice'
import { useContactSearch } from '@common/features/Contacts/hooks/useContactSearch'
import { Contact, ContactEntry } from '@common/features/Contacts/contactsTypes'
import {
  Autocomplete,
  ListItem,
  SearchBar,
  Stack,
  useBreakpoints
} from '@linagora/twake-mui'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { useI18n } from 'twake-i18n'
import { ContactAvatar } from './ContactAvatar'
import { contactPath } from './contactPath'

interface SearchOption {
  contact: Contact
  addressBookId: string
  label: string
}

function buildSearchOptions(entries: ContactEntry[]): SearchOption[] {
  return entries.map(entry => ({
    contact: entry.contact,
    addressBookId: entry.addressBookId,
    label: entry.contact.displayName
  }))
}

export const ContactSearchBar: React.FC = () => {
  const { t } = useI18n()
  const navigate = useNavigate()
  const { isMobile } = useBreakpoints()
  const dispatch = useAppDispatch()
  const searchContacts = useContactSearch()

  const [inputValue, setInputValue] = useState('')
  const [options, setOptions] = useState<SearchOption[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)

  const fetchSearchResults = useCallback(
    async (search: string) => {
      if (!search.trim()) {
        setOptions([])
        setLoading(false)
        return
      }

      setLoading(true)
      try {
        const entries = await searchContacts(search)
        setOptions(buildSearchOptions(entries))
      } catch {
        setOptions([])
      } finally {
        setLoading(false)
      }
    },
    [searchContacts]
  )

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      void fetchSearchResults(inputValue)
    }, 300)

    return (): void => clearTimeout(timeoutId)
  }, [inputValue, fetchSearchResults])

  const handleChange = (_event: unknown, value: SearchOption | null): void => {
    if (value) {
      dispatch(
        addContactFromSearch({
          addressBookId: value.addressBookId,
          contact: value.contact
        })
      )
      void navigate(contactPath(value.addressBookId, value.contact.id))
      setInputValue('')
      setOptions([])
    }
  }

  return (
    <Autocomplete
      value={null}
      open={open && inputValue.trim().length > 0}
      onOpen={() => setOpen(true)}
      onClose={() => setOpen(false)}
      options={options}
      getOptionLabel={option => option.label}
      inputValue={inputValue}
      onInputChange={(_event, newInputValue) => {
        setInputValue(newInputValue)
        setLoading(true)
      }}
      onChange={handleChange}
      loading={loading}
      noOptionsText={t('contacts.search.noResults')}
      loadingText={t('contacts.search.loading')}
      renderInput={params => (
        <SearchBar
          ref={params.slotProps.input.ref}
          onMouseDown={params.slotProps.input.onMouseDown}
          value={inputValue}
          placeholder={t('contacts.search.placeholder')}
          onClear={() => setInputValue('')}
          componentsProps={{
            inputBase: { inputProps: params.slotProps.htmlInput }
          }}
        />
      )}
      renderOption={(props, option) => (
        <ListItem {...props} key={option.contact.id}>
          <Stack direction="row" spacing={1}>
            <ContactAvatar size="s" displayName={option.contact.displayName} />
            <span>{option.label}</span>
          </Stack>
        </ListItem>
      )}
      isOptionEqualToValue={(option, value): boolean =>
        option.contact.id === value.contact.id
      }
      className={isMobile ? 'u-w-100' : 'u-miw-7'}
    />
  )
}
