import { Autocomplete, TextField } from '@linagora/twake-mui'
import { useAppSelector } from '@common/app/hooks'
import { searchContacts } from '@common/features/Contacts/ContactsDao'
import { Contact } from '@common/features/Contacts/contactsTypes'
import { useI18n } from 'twake-i18n'
import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

interface SearchOption {
  contact: Contact
  addressBookId: string
  label: string
}

export const ContactSearchBar: React.FC = () => {
  const { t } = useI18n()
  const navigate = useNavigate()
  const openpaasId = useAppSelector(state => state.user.userData.openpaasId)
  const addressBooks = useAppSelector(state => state.contacts.addressBooks)

  const [inputValue, setInputValue] = useState('')
  const [options, setOptions] = useState<SearchOption[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)

  const fetchSearchResults = useCallback(
    async (search: string) => {
      if (!openpaasId || !search.trim()) {
        setOptions([])
        return
      }

      setLoading(true)
      try {
        const contacts = await searchContacts(openpaasId, search)
        const searchOptions: SearchOption[] = contacts.map(contact => {
          const addressBookId =
            Object.values(addressBooks).find(book =>
              book.contacts.some(c => c.id === contact.id)
            )?.id ?? 'contacts'
          return {
            contact,
            addressBookId,
            label: contact.displayName
          }
        })
        setOptions(searchOptions)
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
      fullWidth
      open={open && inputValue.trim().length > 0}
      onOpen={() => setOpen(true)}
      onClose={() => setOpen(false)}
      options={options}
      getOptionLabel={option => option.label}
      inputValue={inputValue}
      onInputChange={(_event, newInputValue) => setInputValue(newInputValue)}
      onChange={handleChange}
      loading={loading}
      noOptionsText={t('contacts.search.noResults')}
      loadingText={t('contacts.search.loading')}
      renderInput={params => (
        <TextField
          {...params}
          placeholder={t('contacts.search.placeholder')}
          size="small"
        />
      )}
      isOptionEqualToValue={(option, value): boolean =>
        option.contact.id === value.contact.id
      }
    />
  )
}
