import { useAppDispatch, useAppSelector } from '@common/app/hooks'
import { fetchMoreContacts } from '@common/features/Contacts/ContactsSlice'
import {
  BookScope,
  selectBook,
  selectContactEntries,
  selectListingKeyToLoadMore
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
  Typography,
  useBreakpoints
} from '@linagora/twake-mui'
import { useCallback, useEffect } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import { useI18n } from 'twake-i18n'
import { ContactsTable } from './ContactsTable'
import { NoContactsEmptyState } from './NoContactsEmptyState'
import { ImportContactsButton } from './ImportContactsButton'

export const AddressBookPage: React.FC = () => {
  const { t } = useI18n()
  const { isMobile } = useBreakpoints()
  const dispatch = useAppDispatch()
  const { addressBookId } = useParams()
  const openpaasId = useAppSelector(state => state.user.userData.openpaasId)
  const book = useAppSelector(state => selectBook(state, addressBookId))
  const loading = useAppSelector(state => state.contacts.loading)

  const [searchParams, setSearchParams] = useSearchParams()
  const selectedTab: BookScope =
    searchParams.get('scope') === 'shared' ? 'shared' : 'mine'
  // no reset when switching books: the tab lives in the URL, which the
  // sidebar links replace, so /contacts starts again on 'mine'

  const scope = addressBookId ? undefined : selectedTab

  const entries = useAppSelector(state =>
    selectContactEntries(state, addressBookId, scope, openpaasId)
  )

  const listingKeyToLoadMore = useAppSelector(state =>
    selectListingKeyToLoadMore(state, addressBookId, scope, openpaasId)
  )

  const listingToLoadMore = useAppSelector(state =>
    listingKeyToLoadMore
      ? state.contacts.listings[listingKeyToLoadMore]
      : undefined
  )
  const loadingMore = !!listingToLoadMore?.loadingRequestId

  const title = addressBookId
    ? getAddressBookDisplayName(book, t)
    : t('contacts.myContacts')

  const loadMore = useCallback(() => {
    // pages are read once the books are known, to place their contacts
    if (!openpaasId || loading || !listingKeyToLoadMore) return
    void dispatch(
      fetchMoreContacts({
        userId: openpaasId,
        listingKey: listingKeyToLoadMore
      })
    )
  }, [dispatch, openpaasId, loading, listingKeyToLoadMore])

  // The table only reports the end of the rows it shows: the first page of a
  // listing, as after the books are loaded again, and the pages of a list
  // still showing nothing are requested here
  useEffect(() => {
    if (!listingToLoadMore || entries.length === 0) loadMore()
  }, [listingToLoadMore, entries.length, loadMore])

  if (addressBookId && !book && !loading) {
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
          loadingMore={loadingMore}
        />
      )
    }
    return listingKeyToLoadMore ? (
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
          <Stack
            direction="row"
            className="u-flex-items-center u-w-100"
            spacing={2}
          >
            {!isMobile && <Typography variant="h4">{title}</Typography>}
            {!addressBookId && (
              <Tabs
                className={isMobile ? 'u-w-100' : ''}
                value={selectedTab}
                onChange={(_e, value: BookScope) =>
                  setSearchParams(previous => {
                    const next = new URLSearchParams(previous)
                    if (value === 'shared') next.set('scope', value)
                    else next.delete('scope')
                    return next
                  })
                }
                segmented
              >
                <Tab value="mine" label={t('contacts.tabs.mine')} />
                <Tab value="shared" label={t('contacts.tabs.shared')} />
              </Tabs>
            )}
          </Stack>
        )}
        {!isMobile &&
          (addressBookId !== 'dab' || book?.canWrite) &&
          entries.length > 0 && (
            <ImportContactsButton addressBookId={addressBookId} />
          )}
      </Stack>
      {renderContent()}
    </Stack>
  )
}
