import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  Autocomplete,
  AutocompleteProps,
  ListItem,
  Stack,
  Avatar,
  Typography,
  getInitials
} from '@linagora/twake-mui'
import { useI18n } from 'twake-i18n'

export type UserSearchProps<
  T,
  Multiple extends boolean | undefined,
  DisableClearable extends boolean | undefined,
  FreeSolo extends boolean | undefined
> = Omit<
  AutocompleteProps<T, Multiple, DisableClearable, FreeSolo>,
  | 'options'
  | 'loading'
  | 'inputValue'
  | 'onInputChange'
  | 'open'
  | 'onOpen'
  | 'onClose'
  | 'filterOptions'
  | 'noOptionsText'
  | 'loadingText'
  | 'renderOption'
  | 'renderTags'
> & {
  fetchOptions: (search: string) => Promise<T[]>
  debounceMs?: number
  clearOnSelect?: boolean
  getOptionName: (option: T) => string
  getOptionEmail?: (option: T) => string
  getOptionKey: (option: T) => string
  renderOption?: AutocompleteProps<
    T,
    Multiple,
    DisableClearable,
    FreeSolo
  >['renderOption']
  renderTags?: (
    value: T[],
    getTagProps: (params: { index: number }) => {
      key: string | number
      className?: string
      disabled?: boolean
      'data-tag-index'?: number
      tabIndex?: number
      onDelete?: (event: React.SyntheticEvent) => void
    }
  ) => React.ReactNode
}

const renderUserSearchOption = <T,>({
  props,
  option,
  getOptionName,
  getOptionKey,
  getOptionEmail
}: {
  props: React.HTMLAttributes<HTMLLIElement>
  option: T
  getOptionName: (option: T) => string
  getOptionKey: (option: T) => string
  getOptionEmail?: (option: T) => string
}): React.JSX.Element => {
  const name = getOptionName(option)
  const email = getOptionEmail?.(option)

  return (
    <ListItem {...props} key={getOptionKey(option)}>
      <Stack direction="row" spacing={1} className="u-flex-items-center">
        <Avatar size="s">{getInitials(name, email || '')}</Avatar>
        <Stack>
          <Typography variant="body1">{name}</Typography>
          {email && (
            <Typography variant="body2" color="textSecondary">
              {email}
            </Typography>
          )}
        </Stack>
      </Stack>
    </ListItem>
  )
}

const CLEAR_SELECTION_REASONS = new Set([
  'selectOption',
  'createOption',
  'removeOption'
])

interface UseUserSearchFetchParams<T> {
  fetchOptions: (search: string) => Promise<T[]>
  debounceMs: number
}

interface UseUserSearchFetchReturn<T> {
  inputValue: string
  setInputValue: React.Dispatch<React.SetStateAction<string>>
  options: readonly T[]
  setOptions: React.Dispatch<React.SetStateAction<readonly T[]>>
  loading: boolean
  setLoading: React.Dispatch<React.SetStateAction<boolean>>
}

function useUserSearchFetch<T>({
  fetchOptions,
  debounceMs
}: UseUserSearchFetchParams<T>): UseUserSearchFetchReturn<T> {
  const [inputValue, setInputValue] = useState('')
  const [options, setOptions] = useState<readonly T[]>([])
  const [loading, setLoading] = useState(false)
  const requestIdRef = useRef(0)

  const handleFetch = useCallback(
    async (search: string) => {
      const requestId = ++requestIdRef.current
      if (!search.trim()) {
        setOptions([])
        setLoading(false)
        return
      }

      setLoading(true)
      try {
        const results = await fetchOptions(search)
        if (requestId === requestIdRef.current) {
          setOptions(results)
        }
      } catch {
        if (requestId === requestIdRef.current) {
          setOptions([])
        }
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false)
        }
      }
    },
    [fetchOptions]
  )

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      void handleFetch(inputValue)
    }, debounceMs)

    return (): void => clearTimeout(timeoutId)
  }, [inputValue, handleFetch, debounceMs])

  return {
    inputValue,
    setInputValue,
    options,
    setOptions,
    loading,
    setLoading
  }
}

export const UserSearch = <
  T,
  Multiple extends boolean | undefined = undefined,
  DisableClearable extends boolean | undefined = undefined,
  FreeSolo extends boolean | undefined = undefined
>({
  fetchOptions,
  debounceMs = 300,
  clearOnSelect = false,
  getOptionName,
  getOptionEmail,
  getOptionKey,
  renderOption,
  onChange,
  ...rest
}: UserSearchProps<
  T,
  Multiple,
  DisableClearable,
  FreeSolo
>): React.ReactElement => {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const {
    inputValue,
    setInputValue,
    options,
    setOptions,
    loading,
    setLoading
  } = useUserSearchFetch({ fetchOptions, debounceMs })

  const defaultRenderOption = useCallback(
    (
      props: React.HTMLAttributes<HTMLLIElement>,
      option: T
    ): React.JSX.Element =>
      renderUserSearchOption({
        props,
        option,
        getOptionName,
        getOptionKey,
        getOptionEmail
      }),
    [getOptionName, getOptionKey, getOptionEmail]
  )

  const isMenuOpen = open && inputValue.trim().length > 0

  return (
    <Autocomplete
      {...rest}
      open={isMenuOpen}
      onOpen={() => setOpen(true)}
      onClose={() => setOpen(false)}
      options={options}
      loading={loading}
      inputValue={inputValue}
      onInputChange={(_event, newInputValue, reason) => {
        setInputValue(newInputValue)
        if (reason === 'input') {
          setLoading(true)
        }
      }}
      onChange={(event, newValue, reason, details) => {
        onChange?.(event, newValue, reason, details)
        if (clearOnSelect && CLEAR_SELECTION_REASONS.has(reason)) {
          setInputValue('')
          setOptions([])
        }
      }}
      filterOptions={(x: T[]) => x}
      noOptionsText={t('contacts.search.noResults')}
      loadingText={t('contacts.search.loading')}
      renderOption={renderOption || defaultRenderOption}
    />
  )
}
