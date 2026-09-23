import { useAppDispatch, useAppSelector } from '@common/app/hooks'
import { fetchMoreContacts } from '@common/features/Contacts/ContactsSlice'
import {
  selectBook,
  selectBookIdToLoadMore,
  selectContactEntries
} from '@common/features/Contacts/contactsSelectors'
import { getAddressBookDisplayName } from '@common/features/Contacts/contactsUtils'
import { CircularProgress, Stack, Typography } from '@linagora/twake-mui'
import { useCallback, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useI18n } from 'twake-i18n'
import { ContactSearchBar } from './ContactSearchBar'
import { ContactsTable } from './ContactsTable'
import { NoContactsEmptyState } from './NoContactsEmptyState'

export const AddressBookPage: React.FC = () => {
  const { t } = useI18n()
  const dispatch = useAppDispatch()
  const { addressBookId } = useParams()
  const openpaasId = useAppSelector(state => state.user.userData.openpaasId)
  const book = useAppSelector(state => selectBook(state, addressBookId))
  const entries = useAppSelector(state =>
    selectContactEntries(state, addressBookId)
  )
  const bookIdToLoadMore = useAppSelector(state =>
    selectBookIdToLoadMore(state, addressBookId)
  )
  const title = addressBookId
    ? getAddressBookDisplayName(book, t)
    : t('contacts.myContacts')

  const loadMore = useCallback(() => {
    if (!openpaasId || !bookIdToLoadMore) return
    void dispatch(
      fetchMoreContacts({ userId: openpaasId, bookId: bookIdToLoadMore })
    )
  }, [dispatch, openpaasId, bookIdToLoadMore])

  // the table never reports the end of an empty list, so the first page of a
  // book the initial fetch skipped is requested here
  useEffect(() => {
    if (entries.length === 0) loadMore()
  }, [entries.length, loadMore])

  const renderContent = (): React.ReactNode => {
    if (entries.length > 0) {
      return (
        <ContactsTable
          key={addressBookId ?? 'all'}
          entries={entries}
          readOnly={addressBookId === 'dab'}
          onEndReached={loadMore}
        />
      )
    }
    return bookIdToLoadMore ? <CircularProgress /> : <NoContactsEmptyState />
  }

  return (
    <Stack spacing={2} className="u-flex-auto u-ov-hidden">
      <ContactSearchBar />
      <Typography variant="h4" gutterBottom>
        {title}
      </Typography>
      {renderContent()}
    </Stack>
  )
}
