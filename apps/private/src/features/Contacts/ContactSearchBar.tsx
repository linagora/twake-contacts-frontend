import { useAppDispatch, useAppSelector } from '@common/app/hooks'
import { addContactFromSearch } from '@common/features/Contacts/ContactsSlice'
import {
  AddressBookRef,
  searchContacts
} from '@common/features/Contacts/ContactsDao'
import { Contact, ContactEntry } from '@common/features/Contacts/contactsTypes'
import { SearchBar } from '@linagora/twake-mui'
import { useMemo } from 'react'
import { useNavigate } from 'react-router'
import { useI18n } from 'twake-i18n'
import { UserSearch } from '@common/components/Common/UserSearch'

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
  const dispatch = useAppDispatch()
  const addressBooksRecord = useAppSelector(
    state => state.contacts.addressBooks
  )
  const addressBooks = useMemo(
    () => Object.values(addressBooksRecord),
    [addressBooksRecord]
  )

  const addressBookRefs = useMemo<AddressBookRef[]>(
    () =>
      addressBooks.map(book => ({
        userId: book.userId,
        addressBookId: book.id === 'dab' ? 'domain-members' : book.id
      })),
    [addressBooks]
  )

  const handleChange = (_event: unknown, value: SearchOption | null): void => {
    if (value) {
      const storeAddressBookId =
        value.addressBookId === 'domain-members' ? 'dab' : value.addressBookId
      dispatch(
        addContactFromSearch({
          addressBookId: storeAddressBookId,
          contact: value.contact
        })
      )
      void navigate(`/contacts/${storeAddressBookId}/${value.contact.id}`)
    }
  }

  return (
    <UserSearch
      value={null}
      fetchOptions={async search => {
        if (addressBookRefs.length === 0) return []
        const entries = await searchContacts(addressBookRefs, search)
        return buildSearchOptions(entries)
      }}
      clearOnSelect={true}
      getOptionLabel={(option: SearchOption) => option.label}
      onChange={handleChange}
      renderInput={params => (
        <SearchBar
          ref={params.slotProps.input.ref}
          onMouseDown={params.slotProps.input.onMouseDown}
          value={params.slotProps?.htmlInput?.value as string | undefined}
          placeholder={t('contacts.search.placeholder')}
          componentsProps={{
            inputBase: { inputProps: params.slotProps.htmlInput }
          }}
        />
      )}
      getOptionName={option => option.label}
      getOptionKey={option => option.contact.id}
      isOptionEqualToValue={(
        option: SearchOption,
        value: SearchOption
      ): boolean => option.contact.id === value.contact.id}
      className="u-maw-7"
    />
  )
}
