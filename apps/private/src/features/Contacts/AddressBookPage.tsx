import { useAppDispatch, useAppSelector } from '@common/app/hooks'
import { fetchMoreContacts } from '@common/features/Contacts/ContactsSlice'
import {
  BookScope,
  selectBook,
  selectBookIdToLoadMore,
  selectContactEntries
} from '@common/features/Contacts/contactsSelectors'
import { getAddressBookDisplayName } from '@common/features/Contacts/contactsUtils'
import { Icon, Left } from '@linagora/twake-icons'
import {
  Button,
  CircularProgress,
  Skeleton,
  Stack,
  Tab,
  Tabs,
  Typography
} from '@linagora/twake-mui'
import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { useI18n } from 'twake-i18n'
import { ContactsTable } from './ContactsTable'
import { NoContactsEmptyState } from './NoContactsEmptyState'
import { ImportContactsButton } from './ImportContactsButton'

export const AddressBookPage: React.FC = () => {
  const { t } = useI18n()
  const dispatch = useAppDispatch()
  const { addressBookId } = useParams()
  const openpaasId = useAppSelector(state => state.user.userData.openpaasId)
  const book = useAppSelector(state => selectBook(state, addressBookId))
  const loading = useAppSelector(state => state.contacts.loading)

  const [selectedTab, setSelectedTab] = useState<BookScope>('mine')

  const scope = addressBookId ? undefined : selectedTab

  const entries = useAppSelector(state =>
    selectContactEntries(state, addressBookId, scope, openpaasId)
  )

  const bookIdToLoadMore = useAppSelector(state =>
    selectBookIdToLoadMore(state, addressBookId, scope, openpaasId)
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

  if (addressBookId && !book) {
    return (
      <Stack spacing={3}>
        <Button
          component={Link}
          to="/contacts"
          variant="text"
          startIcon={<Icon icon={Left} />}
        >
          {t('contacts.back')}
        </Button>
        <Typography color="text.secondary">
          {t('contacts.addressBookNotFound')}
        </Typography>
      </Stack>
    )
  }

  const renderContent = (): React.ReactNode => {
    if (entries.length > 0 || loading) {
      return (
        <ContactsTable
          key={`${addressBookId ?? 'all'}-${scope ?? ''}`}
          entries={entries}
          onEndReached={loadMore}
          loading={loading}
        />
      )
    }
    return bookIdToLoadMore ? (
      <CircularProgress />
    ) : (
      <NoContactsEmptyState
        action={
          scope === 'shared' ? null : (
            <ImportContactsButton addressBookId={addressBookId} />
          )
        }
      />
    )
  }

  return (
    <Stack spacing={2} className="u-flex-auto u-ov-hidden">
      <Stack
        direction="row"
        className="u-flex-justify-between u-flex-items-center"
      >
        {loading ? (
          <Skeleton variant="text" width={200} height={40} />
        ) : (
          <Stack direction="row" className="u-flex-items-center" spacing={2}>
            <Typography variant="h4">{title}</Typography>
            {!addressBookId && (
              <Tabs
                value={selectedTab}
                onChange={(_e, value: BookScope) => setSelectedTab(value)}
                segmented
              >
                <Tab value="mine" label={t('contacts.tabs.mine')} />
                <Tab value="shared" label={t('contacts.tabs.shared')} />
              </Tabs>
            )}
          </Stack>
        )}
        {(addressBookId !== 'dab' || book?.canWrite) && (
          <ImportContactsButton addressBookId={addressBookId} />
        )}
      </Stack>
      {renderContent()}
    </Stack>
  )
}
