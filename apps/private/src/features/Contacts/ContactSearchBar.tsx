import { useAppDispatch } from '@common/app/hooks'
import { addContactFromSearch } from '@common/features/Contacts/ContactsSlice'
import { useContactSearch } from '@common/features/Contacts/hooks/useContactSearch'
import { Contact, ContactEntry } from '@common/features/Contacts/contactsTypes'
import {
  Autocomplete,
  Box,
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

const RESULTS_ANNOUNCEMENT_DELAY_MS = 500

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
  // the last search failed: its empty options are not an empty result
  const [failed, setFailed] = useState(false)
  const [open, setOpen] = useState(false)
  // number of results to announce, null while there is nothing to announce
  const [announcedCount, setAnnouncedCount] = useState<number | null>(null)

  const fetchSearchResults = useCallback(
    async (search: string, signal: AbortSignal) => {
      if (!search.trim()) {
        setOptions([])
        setFailed(false)
        setLoading(false)
        return
      }

      setLoading(true)
      setFailed(false)
      try {
        const entries = await searchContacts(search, signal)
        if (signal.aborted) return
        setOptions(buildSearchOptions(entries))
      } catch {
        // a superseded search leaves the state to the search replacing it
        if (signal.aborted) return
        setOptions([])
        setFailed(true)
      }
      setLoading(false)
    },
    [searchContacts]
  )

  // Each new input aborts the search of the previous one, so a late answer
  // never overwrites the results of a newer query
  useEffect(() => {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => {
      void fetchSearchResults(inputValue, controller.signal)
    }, 300)

    return (): void => {
      clearTimeout(timeoutId)
      controller.abort()
    }
  }, [inputValue, fetchSearchResults])

  // Emptied while searching so that an identical count is announced again
  useEffect(() => {
    setAnnouncedCount(null)
    if (loading || !inputValue.trim()) return

    const timeoutId = setTimeout(
      () => setAnnouncedCount(options.length),
      RESULTS_ANNOUNCEMENT_DELAY_MS
    )

    return (): void => clearTimeout(timeoutId)
  }, [loading, inputValue, options])

  const noOptionsText = failed
    ? t('contacts.search.failed')
    : t('contacts.search.noResults')

  const resultsStatus =
    announcedCount === null
      ? ''
      : announcedCount === 0
        ? noOptionsText
        : t('contacts.search.resultsCount', { smart_count: announcedCount })

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
    <>
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
        noOptionsText={noOptionsText}
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
              <ContactAvatar
                size="s"
                displayName={option.contact.displayName}
              />
              <span>{option.label}</span>
            </Stack>
          </ListItem>
        )}
        isOptionEqualToValue={(option, value): boolean =>
          option.contact.id === value.contact.id
        }
        className={isMobile ? 'u-w-100' : 'u-miw-7'}
      />
      <Box role="status" aria-live="polite" className="u-visuallyhidden">
        {resultsStatus}
      </Box>
    </>
  )
}
