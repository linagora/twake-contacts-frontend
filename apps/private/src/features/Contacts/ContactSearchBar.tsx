import { useAppSelector } from '@common/app/hooks'
import { DEFAULT_ADDRESS_BOOK_ID } from '@common/features/Contacts/constants'
import { searchContacts } from '@common/features/Contacts/ContactsDao'
import {
  AddressBookWithContacts,
  Contact
} from '@common/features/Contacts/contactsTypes'
import {
  Autocomplete,
  Avatar,
  ListItem,
  SearchBar,
  Stack
} from '@linagora/twake-mui'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { useI18n } from 'twake-i18n'
import { getInitials } from './getInitials'

interface SearchOption {
  contact: Contact
  addressBookId: string
  label: string
}

function buildSearchOptions(
  contacts: Contact[],
  addressBooks: AddressBookWithContacts[]
): SearchOption[] {
  return contacts.map(contact => {
    const addressBookId =
      addressBooks.find(book => book.contacts.some(c => c.id === contact.id))
        ?.id ?? DEFAULT_ADDRESS_BOOK_ID
    return {
      contact,
      addressBookId,
      label: contact.displayName
    }
  })
}

export const ContactSearchBar: React.FC = () => {
  const { t } = useI18n()
  const navigate = useNavigate()
  const openpaasId = useAppSelector(state => state.user.userData.openpaasId)
  const addressBooksRecord = useAppSelector(
    state => state.contacts.addressBooks
  )
  const addressBooks = useMemo(
    () => Object.values(addressBooksRecord),
    [addressBooksRecord]
  )

  const [inputValue, setInputValue] = useState('')
  const [options, setOptions] = useState<SearchOption[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)

  const fetchSearchResults = useCallback(
    async (search: string) => {
      if (!openpaasId || !search.trim()) {
        setOptions([])
        setLoading(false)
        return
      }

      setLoading(true)
      try {
        const contacts = await searchContacts(openpaasId, search)
        setOptions(buildSearchOptions(contacts, addressBooks))
      } catch {
        setOptions([])
      } finally {
        setLoading(false)
      }
    },
    [openpaasId, addressBooks]
  )

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      void fetchSearchResults(inputValue)
    }, 300)

    return (): void => clearTimeout(timeoutId)
  }, [inputValue, fetchSearchResults])

  const handleChange = (_event: unknown, value: SearchOption | null): void => {
    if (value) {
      void navigate(`/contacts/${value.addressBookId}/${value.contact.id}`)
      setInputValue('')
      setOptions([])
    }
  }

  return (
    <Autocomplete
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
            <Avatar size="s">{getInitials(option.contact.displayName)}</Avatar>
            <span>{option.label}</span>
          </Stack>
        </ListItem>
      )}
      isOptionEqualToValue={(option, value): boolean =>
        option.contact.id === value.contact.id
      }
      className="u-maw-7 u-mb-1"
    />
  )
}
